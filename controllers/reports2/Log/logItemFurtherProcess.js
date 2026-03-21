import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_view_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { slicing_done_items_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { peeling_done_items_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import { process_done_items_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import grouping_done_history_model from '../../../database/schema/factory/grouping/grouping_done_history.schema.js';
import { tapping_done_items_details_model } from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import {
  pressing_done_details_model,
  pressing_done_consumed_items_details_model,
} from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import cnc_history_model from '../../../database/schema/factory/cnc/cnc_history/cnc.history.schema.js';
import { color_done_details_model } from '../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import color_history_model from '../../../database/schema/factory/colour/colour_history/colour_history.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { createLogItemFurtherProcessReportExcel } from '../../../config/downloadExcel/reports2/Log/logItemFurtherProcess.js';

// ─────────────────────────── Utility helpers ────────────────────────────────

const groupByKey = (arr, keyFn) => {
  const map = new Map();
  for (const item of arr) {
    const k = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (k == null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
};

const getVal = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);

const sumField = (arr, field) =>
  arr.reduce((acc, item) => acc + (parseFloat(getVal(item, field)) || 0), 0);

const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;

// Build regex pattern: code followed by one or more capital letters, end of string
// e.g. flitch_code "L0702A1" → /^L0702A1[A-Z]+$/
// Correctly distinguishes L0702A1A (matches) from L0702A10A (does NOT match for parent L0702A1
// because "10" has a digit after the base code)
const buildChildPattern = (code) => {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}[A-Z]+$`);
};

/**
 * Cross Cut Issue in(CMT) — cols 9–10: Issue For Flitch/Peeling + Status.
 * Populated from crosscutting_done (crosscut done history) only when issued
 * onward to flitching or peeling.
 */
const crosscutIssueForFlitchPeeling = (cc) => {
  if (!cc) return { issue_for: '', status: '' };
  const s = cc.issue_status;
  if (s === 'peeling' || s === 'flitching') {
    return { issue_for: cc.crosscut_cmt ?? '', status: s };
  }
  return { issue_for: '', status: '' };
};

/** Splicing Issue Status: tapping → pressing from `tapping_done_history` (not tapping line `issued_for`). */
function formatTappingPressingIssueLabel(issueStatus, issuedFor) {
  if (!issueStatus && !issuedFor) return '';
  const cap = (s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  const stage = issueStatus ? cap(String(issueStatus)) : '';
  const dest = issuedFor ? String(issuedFor).trim() : '';
  if (stage && dest) return `${stage} / ${dest}`;
  return stage || dest;
}

function resolveSplicingIssueStatusFromHistory(tappingItems, tappingIssueStatusByItemId) {
  if (!tappingItems?.length || !tappingIssueStatusByItemId?.size) return '';
  for (const t of tappingItems) {
    const v = tappingIssueStatusByItemId.get(String(t._id));
    if (v) return v;
  }
  return '';
}

/** Pressing Issue Status: only after issue to next factory; from `pressing_done_history` (not `pressing_done_details.issued_for`). */
function formatPressingIssueLabel(issueStatus, issuedFor) {
  if (!issueStatus && !issuedFor) return '';
  const stage = issueStatus ? String(issueStatus).trim() : '';
  const dest = issuedFor ? String(issuedFor).trim() : '';
  if (stage && dest) return `${stage} / ${dest}`;
  return stage || dest;
}

function resolvePressingIssueStatusFromHistory(pressingItems, pressingIssueStatusByItemId) {
  if (!pressingItems?.length || !pressingIssueStatusByItemId?.size) return '';
  for (const p of pressingItems) {
    const v = pressingIssueStatusByItemId.get(String(p._id));
    if (v) return v;
  }
  return '';
}

// Empty data for all columns from Grouping/Clipping onwards
const emptyDownstream = () => ({
  grouping_new_group_no: '',
  grouping_rec_sheets: '',
  grouping_rec_sqm: '',
  grouping_issue_sheets: '',
  grouping_issue_sqm: '',
  grouping_issue_status: '',
  grouping_balance_sheets: '',
  grouping_balance_sqm: '',
  splicing_rec_machine_sqm: '',
  splicing_rec_hand_sqm: '',
  splicing_sheets: '',
  splicing_issue_sheets: '',
  splicing_issue_status: '',
  splicing_balance_sheets: '',
  splicing_balance_sqm: '',
  pressing_sheets: '',
  pressing_sqm: '',
  pressing_issue_sheets: '',
  pressing_issue_sqm: '',
  pressing_issue_status: '',
  pressing_balance_sheets: '',
  pressing_balance_sqm: '',
  cnc_type: '',
  cnc_rec_sheets: '',
  colour_rec_sheets: '',
  sales_order_no: '',
  sales_order_date: '',
  sales_customer: '',
  sales_rec_sheets: '',
  jwc_veneer: '',
  awc_pressing_sheets: '',
});

const emptyFlitch = () => ({
  flitch_no: '',
  flitch_rec: '',
  flitch_issue_for: '',
  flitch_status: '',
});

const emptySlicing = () => ({
  slicing_side: '',
  slicing_process_cmt: '',
  slicing_balance_cmt: '',
  slicing_rec_leaf: '',
});

const emptyPeeling = () => ({
  peeling_process: '',
  peeling_balance_rostroller: '',
  peeling_output: '',
  peeling_rec_leaf: '',
});

const emptyDressing = () => ({
  dress_rec_sqm: '',
  dress_issue_sqm: '',
  dress_issue_status: '',
});

const emptySmoking = () => ({
  smoking_process: '',
  smoking_issue_sqm: '',
  smoking_issue_status: '',
});

// ─────────────────────── Grouping + downstream builder ──────────────────────

function buildGroupingData(
  groupItem,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId,
  groupingIssuedForByItemId,
  tappingIssueStatusByItemId,
  pressingIssuedSheetsByItemId,
  pressingIssuedSqmByItemId,
  pressingIssueStatusByItemId,
  groupingIssueStatusByItemId,
  orderMaps
) {
  const groupNo = groupItem.group_no;
  const recSheets = groupItem.no_of_sheets || 0;
  const recSqm = groupItem.sqm || 0;
  const availSheets =
    getVal(groupItem, 'available_details.no_of_sheets') ?? recSheets;
  const availSqm = getVal(groupItem, 'available_details.sqm') ?? recSqm;
  const issueSheets = Math.max(0, recSheets - availSheets);
  const issueSqm = Math.max(0, recSqm - availSqm);

  // Splicing / Tapping
  const tappingItems = tappingByGroupNo.get(groupNo) || [];
  const machineItems = tappingItems.filter(
    (t) => getVal(t, 'tapping_details.splicing_type') === 'MACHINE SPLICING'
  );
  const handItems = tappingItems.filter(
    (t) => getVal(t, 'tapping_details.splicing_type') === 'HAND SPLICING'
  );
  const machineSqm = sumField(machineItems, 'sqm');
  const handSqm = sumField(handItems, 'sqm');
  const splicingSheets = sumField(tappingItems, 'no_of_sheets');
  const splicingAvailSheets = sumField(
    tappingItems,
    'available_details.no_of_sheets'
  );
  const splicingAvailSqm = sumField(tappingItems, 'available_details.sqm');
  const splicingIssueSheets = Math.max(0, splicingSheets - splicingAvailSheets);
  const splicingIssueSqm = Math.max(
    0,
    sumField(tappingItems, 'sqm') - splicingAvailSqm
  );
  // Use history-based issue status for tapping/splicing
  const splicingIssueStatus = resolveSplicingIssueStatusFromHistory(
    tappingItems,
    tappingIssueStatusByItemId
  );

  // Pressing: received from pressing_done_details; issued + status from pressing_done_history
  const pressingItems = pressingByGroupNo.get(groupNo) || [];
  const pressingSheets = sumField(pressingItems, 'no_of_sheets');
  const pressingSqm = sumField(pressingItems, 'sqm');
  const pressingIssueSheets = pressingItems.reduce(
    (acc, p) =>
      acc + (pressingIssuedSheetsByItemId.get(String(p._id)) ?? 0),
    0
  );
  const pressingIssueSqm = pressingItems.reduce(
    (acc, p) =>
      acc + (pressingIssuedSqmByItemId.get(String(p._id)) ?? 0),
    0
  );
  const pressingBalanceSheets = Math.max(0, pressingSheets - pressingIssueSheets);
  const pressingBalanceSqm = Math.max(0, pressingSqm - pressingIssueSqm);
  const pressingIssueStatus = resolvePressingIssueStatusFromHistory(
    pressingItems,
    pressingIssueStatusByItemId
  );

  // CNC & Colour via pressing._id
  const pressingIds = pressingItems.map((p) => String(p._id));
  const cncItems = pressingIds.flatMap((id) => cncByPressingId.get(id) || []);
  const colourItems = pressingIds.flatMap(
    (id) => colourByPressingId.get(id) || []
  );
  const cncType = cncItems[0]?.product_type || '';
  const cncRecSheets = sumField(cncItems, 'no_of_sheets');
  const colourRecSheets = sumField(colourItems, 'no_of_sheets');

  // For balance fields: show the numeric value (even 0) when the upstream
  // process was actually done; keep '' when it was never done.
  const hasTapping = tappingItems.length > 0;
  const hasPressing = pressingItems.length > 0;

  // ── Order / Sales resolution ──────────────────────────────────────────────
  // Priority (most-downstream first): Colour → CNC → Pressing → Tapping → Grouping
  const {
    groupingOrderIdByItemId,
    tappingOrderIdByItemId,
    pressingOrderIdByItemId,
    cncOrderIdByItemId,
    colourOrderIdByItemId,
    orderById,
  } = orderMaps || {};

  let resolvedOrderId = null;
  for (const c of colourItems) {
    const oid = colourOrderIdByItemId?.get(String(c._id));
    if (oid) { resolvedOrderId = oid; break; }
  }
  if (!resolvedOrderId) {
    for (const c of cncItems) {
      const oid = cncOrderIdByItemId?.get(String(c._id));
      if (oid) { resolvedOrderId = oid; break; }
    }
  }
  if (!resolvedOrderId) {
    for (const p of pressingItems) {
      const oid = pressingOrderIdByItemId?.get(String(p._id));
      if (oid) { resolvedOrderId = oid; break; }
    }
  }
  if (!resolvedOrderId) {
    for (const t of tappingItems) {
      const oid = tappingOrderIdByItemId?.get(String(t._id));
      if (oid) { resolvedOrderId = oid; break; }
    }
  }
  if (!resolvedOrderId) {
    resolvedOrderId = groupingOrderIdByItemId?.get(String(groupItem._id));
  }
  const order = resolvedOrderId ? orderById?.get(String(resolvedOrderId)) : null;

  return {
    grouping_new_group_no: groupNo,
    grouping_rec_sheets: recSheets || '',
    grouping_rec_sqm: recSqm || '',
    grouping_issue_sheets: issueSheets || '',
    grouping_issue_sqm: issueSqm || '',
    grouping_issue_status: groupingIssueStatusByItemId?.get(String(groupItem._id)) || '',
    // grouping was done → always show numeric (0 is meaningful here)
    grouping_balance_sheets: availSheets,
    grouping_balance_sqm: availSqm,
    splicing_rec_machine_sqm: machineSqm || '',
    splicing_rec_hand_sqm: handSqm || '',
    splicing_sheets: splicingSheets || '',
    splicing_issue_sheets: splicingIssueSheets || '',
    splicing_issue_status: splicingIssueStatus,
    splicing_balance_sheets: hasTapping ? splicingAvailSheets : '',
    splicing_balance_sqm: hasTapping ? splicingAvailSqm : '',
    pressing_sheets: pressingSheets || '',
    pressing_sqm: pressingSqm || '',
    pressing_issue_sheets: pressingIssueSheets || '',
    pressing_issue_sqm: pressingIssueSqm || '',
    pressing_issue_status: pressingIssueStatus,
    pressing_balance_sheets: hasPressing ? pressingBalanceSheets : '',
    pressing_balance_sqm: hasPressing ? pressingBalanceSqm : '',
    cnc_type: cncType,
    cnc_rec_sheets: cncRecSheets || '',
    colour_rec_sheets: colourRecSheets || '',
    sales_order_no: order?.order_no || '',
    sales_order_date: order?.orderDate
      ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '',
    sales_customer: order?.owner_name || '',
    sales_rec_sheets: pressingIssueSheets || '',
    jwc_veneer: '',
    awc_pressing_sheets: '',
  };
}

// ─────────────────────── Dressing + Smoking aggregators ─────────────────────

function getDressingData(logNoCode, dressingByCode) {
  const items = dressingByCode.get(logNoCode) || [];
  if (!items.length) return emptyDressing();
  return {
    dress_rec_sqm: sumField(items, 'sqm') || '',
    dress_issue_sqm: sumField(items.filter((d) => d.issue_status), 'sqm') || '',
    dress_issue_status: items.find((d) => d.issue_status)?.issue_status || '',
  };
}

function getSmokingData(logNoCode, smokingByCode) {
  const items = smokingByCode.get(logNoCode) || [];
  if (!items.length) return emptySmoking();
  const issuedItems = items.filter((s) => s.issue_status);
  const totalSqm = round3(sumField(items, 'sqm'));
  const issuedSqm = issuedItems.length ? round3(sumField(issuedItems, 'sqm')) : '';
  return {
    // Total SQM that passed through smoking/dying
    smoking_process: totalSqm || '',
    // SQM that has been issued out from smoking to a downstream process
    smoking_issue_sqm: issuedSqm,
    smoking_issue_status: issuedItems[0]?.issue_status || '',
  };
}

// ─────────────────────── Slicing side rows builder ──────────────────────────

function buildSlicingSideRows(
  logBase,
  ccBase,
  flitchBase,
  side,
  dressingByCode,
  smokingByCode,
  groupingByCode,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId,
  groupingIssuedForByItemId,
  tappingIssueStatusByItemId,
  pressingIssuedSheetsByItemId,
  pressingIssuedSqmByItemId,
  pressingIssueStatusByItemId,
  groupingIssueStatusByItemId,
  orderMaps
) {
  const sideCode = side.log_no_code;

  // Process CMT: individual cmt is not stored per-item; use item_cmt computed
  // during fetch as total_cmt / sibling_count (or raw cmt if it exists).
  const processCmt = parseFloat(side.item_cmt ?? side.cmt) || 0;
  const issuedCmt = parseFloat(side.issued_for_slicing?.cmt) || 0;
  // Balance = issued - processed. Show numeric 0 when slicing was done but
  // all CMT is consumed; keep '' only if issued CMT is unknown.
  const balanceCmt = issuedCmt > 0 ? Math.max(0, issuedCmt - processCmt) : '';

  const slicingBase = {
    slicing_side: sideCode,
    slicing_process_cmt: processCmt || '',
    slicing_balance_cmt: balanceCmt,
    slicing_rec_leaf: side.no_of_leaves || '',
  };

  const dressingData = getDressingData(sideCode, dressingByCode);
  const smokingData = getSmokingData(sideCode, smokingByCode);
  const groupingItems = groupingByCode.get(sideCode) || [];

  if (groupingItems.length > 0) {
    return groupingItems.map((g) => ({
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...slicingBase,
      ...emptyPeeling(),
      ...dressingData,
      ...smokingData,
      ...buildGroupingData(
        g,
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId,
        groupingIssuedForByItemId,
        tappingIssueStatusByItemId,
        pressingIssuedSheetsByItemId,
        pressingIssuedSqmByItemId,
        pressingIssueStatusByItemId,
        groupingIssueStatusByItemId,
        orderMaps
      ),
    }));
  }

  return [
    {
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...slicingBase,
      ...emptyPeeling(),
      ...dressingData,
      ...smokingData,
      ...emptyDownstream(),
    },
  ];
}

// ─────────────────────── Peeling row builder ────────────────────────────────

function buildPeelingRow(
  logBase,
  ccBase,
  flitchBase,
  peel,
  dressingByCode,
  smokingByCode,
  groupingByCode,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId,
  groupingIssuedForByItemId,
  tappingIssueStatusByItemId,
  pressingIssuedSheetsByItemId,
  pressingIssuedSqmByItemId,
  pressingIssueStatusByItemId,
  groupingIssueStatusByItemId,
  orderMaps
) {
  const peelingCode = peel.log_no_code;

  // balance_rostroller is computed in the aggregate as issued_cmt - batch_total_cmt.
  // Show numeric 0 when peeling was done; '' when issued CMT was unavailable.
  const balanceRostroller =
    peel.balance_rostroller != null ? peel.balance_rostroller : '';

  const peelingData = {
    ...emptySlicing(),
    peeling_process: peel.output_type || '',
    peeling_balance_rostroller: balanceRostroller,
    peeling_output: peel.cmt || '',      // cmt stores SQM (length × width × leaves)
    peeling_rec_leaf: peel.no_of_leaves || '',
  };

  const dressingData = getDressingData(peelingCode, dressingByCode);
  const smokingData = getSmokingData(peelingCode, smokingByCode);
  const groupingItems = groupingByCode.get(peelingCode) || [];

  const resolvedFlitch = flitchBase || emptyFlitch();

  if (groupingItems.length > 0) {
    return {
      ...logBase,
      ...ccBase,
      ...resolvedFlitch,
      ...peelingData,
      ...dressingData,
      ...smokingData,
      ...buildGroupingData(
        groupingItems[0],
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId,
        groupingIssuedForByItemId,
        tappingIssueStatusByItemId,
        pressingIssuedSheetsByItemId,
        pressingIssuedSqmByItemId,
        pressingIssueStatusByItemId,
        groupingIssueStatusByItemId,
        orderMaps
      ),
    };
  }

  return {
    ...logBase,
    ...ccBase,
    ...resolvedFlitch,
    ...peelingData,
    ...dressingData,
    ...smokingData,
    ...emptyDownstream(),
  };
}

// ─────────────────────── Flitch rows builder ────────────────────────────────

function buildFlitchRows(
  logBase,
  ccBase,
  flitch,
  slicingByFlitchCode,
  peelingByLogNo,
  dressingByCode,
  smokingByCode,
  groupingByCode,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId,
  groupingIssuedForByItemId,
  tappingIssueStatusByItemId,
  pressingIssuedSheetsByItemId,
  pressingIssuedSqmByItemId,
  pressingIssueStatusByItemId,
  groupingIssueStatusByItemId,
  orderMaps
) {
  // Flitch Issue in(CMT): flitching_done — col 11 = log_no_code, 12–14 from flitch row
  // Display log_no_code in column, but match children using the same code
  const flitchBase = {
    flitch_no: flitch.log_no_code ?? flitch.flitch_code ?? '',
    flitch_rec: flitch.flitch_cmt ?? '',
    flitch_issue_for: flitch.flitch_cmt ?? '',
    flitch_status: flitch.issue_status ?? '',
  };

  // slicing_done_items.log_no == flitch.log_no_code (e.g. "L2105A1").
  // Look up all slicing sides for this flitch directly by flitch code.
  const slicingSides = slicingByFlitchCode.get(flitch.log_no_code ?? '') || [];

  // Peeling sides follow the "{flitchCode}[A-Z]+" convention, so keep the
  // child-pattern filter for peeling.
  const flitchCodeForMatching = flitch.log_no_code ?? flitch.flitch_code ?? '';
  const childPattern = buildChildPattern(flitchCodeForMatching);

  const allPeelingForLog = peelingByLogNo.get(logBase.log_no) || [];
  const peelingForFlitch = allPeelingForLog.filter((p) =>
    childPattern.test(p.log_no_code)
  );

  const rows = [];

  for (const side of slicingSides) {
    rows.push(
      ...buildSlicingSideRows(
        logBase,
        ccBase,
        flitchBase,
        side,
        dressingByCode,
        smokingByCode,
        groupingByCode,
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId,
        groupingIssuedForByItemId,
        tappingIssueStatusByItemId,
        pressingIssuedSheetsByItemId,
        pressingIssuedSqmByItemId,
        pressingIssueStatusByItemId,
        groupingIssueStatusByItemId,
        orderMaps
      )
    );
  }

  for (const peel of peelingForFlitch) {
    rows.push(
      buildPeelingRow(
        logBase,
        ccBase,
        flitchBase,
        peel,
        dressingByCode,
        smokingByCode,
        groupingByCode,
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId,
        groupingIssuedForByItemId,
        tappingIssueStatusByItemId,
        pressingIssuedSheetsByItemId,
        pressingIssuedSqmByItemId,
        pressingIssueStatusByItemId,
        groupingIssueStatusByItemId,
        orderMaps
      )
    );
  }

  if (!rows.length) {
    // Flitch not yet processed further
    rows.push({
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...emptySlicing(),
      ...emptyPeeling(),
      ...emptyDressing(),
      ...emptySmoking(),
      ...emptyDownstream(),
    });
  }

  return rows;
}

// ─────────────────────── Main controller ────────────────────────────────────

/**
 * Inward Log Item Further Process Report
 * Hierarchical report tracking each log from inward through all processing
 * stages: CrossCut → Flitch → Slicing → Dressing → Smoking → Grouping →
 * Splicing → Pressing → CNC → Colour.
 * One row per leaf entity (grouping item / peeling item / slicing side).
 * Empty cells when a stage was not reached for that lineage.
 *
 * @route POST /api/V1/report/download-excel-log-item-further-process-report
 */
export const LogItemFurtherProcessReportExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate, filter = {} } = req.body;

    if (!startDate || !endDate) {
      return next(
        new ApiError('Start date and end date are required', 400)
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(
        new ApiError('Invalid date format. Use YYYY-MM-DD', 400)
      );
    }

    if (start > end) {
      return next(
        new ApiError('Start date cannot be after end date', 400)
      );
    }

    const itemFilter = {};
    if (filter.item_name) itemFilter.item_name = filter.item_name;
    if (filter.log_no) itemFilter.log_no = filter.log_no;
    if (filter.inward_id) {
      itemFilter['log_invoice_details.inward_sr_no'] = Number(filter.inward_id);
    }

    try {
      // ── Step 1: Fetch logs in the date range ─────────────────────────────
      const logs = await log_inventory_items_view_model.aggregate([
        {
          $match: {
            ...itemFilter,
            'log_invoice_details.inward_date': { $gte: start, $lte: end },
          },
        },
        { $sort: { item_name: 1, log_no: 1 } },
      ]);

      if (!logs.length) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              404,
              'No log data found for the selected period'
            )
          );
      }

      const logNos = [...new Set(logs.map((l) => l.log_no))];
      const logIds = logs.map((l) => l._id).filter(Boolean);

      // ── Step 2: Bulk-fetch all processing stage data ──────────────────────
      const [crosscuts, flitches, peelingItems] =
        await Promise.all([
          crosscutting_done_model
            .find({ log_no: { $in: logNos }, deleted_at: null })
            .lean(),
          flitching_done_model
            .find({ log_inventory_item_id: { $in: logIds }, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] })
            .lean(),
          // Use aggregate to join issues_for_peeling_available so we can
          // populate balance_rostroller = issues_for_peeling_available.cmt.
          // This record only exists when type = "rest_roller" was selected
          // in the Reject / Available Details table during peeling done entry.
          peeling_done_items_model.aggregate([
            { $match: { log_no: { $in: logNos } } },
            {
              $lookup: {
                from: 'peeling_done_other_details',
                localField: 'peeling_done_other_details_id',
                foreignField: '_id',
                as: 'peeling_done_other_details',
              },
            },
            {
              $unwind: {
                path: '$peeling_done_other_details',
                preserveNullAndEmptyArrays: true,
              },
            },
            // Join issues_for_peeling_available (only exists when type = "rest_roller")
            {
              $lookup: {
                from: 'issues_for_peeling_available',
                localField: 'peeling_done_other_details.issue_for_peeling_id',
                foreignField: 'issue_for_peeling_id',
                as: 'peeling_available',
              },
            },
            {
              $unwind: {
                path: '$peeling_available',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                // Present only when type = "rest_roller"; null otherwise → '' in JS
                balance_rostroller: { $ifNull: ['$peeling_available.cmt', null] },
              },
            },
            { $project: { peeling_available: 0, peeling_done_other_details: 0 } },
          ]),
        ]);

      // slicing_done_items.log_no stores the FLITCH code (e.g. "L2105A1"), NOT
      // the round-log number. Query by the flitch log_no_code values.
      // Use an aggregate so we can compute item_cmt = total_cmt / sibling_count
      // (individual cmt is not stored per-item; only total_cmt on the batch).
      const flitchLogNoCodes = [
        ...new Set(flitches.map((f) => f.log_no_code).filter(Boolean)),
      ];

      const slicingItems = flitchLogNoCodes.length
        ? await slicing_done_items_model.aggregate([
            { $match: { log_no: { $in: flitchLogNoCodes } } },
            {
              $lookup: {
                from: 'slicing_done_other_details',
                localField: 'slicing_done_other_details_id',
                foreignField: '_id',
                as: 'slicing_done_other_details',
              },
            },
            {
              $unwind: {
                path: '$slicing_done_other_details',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'slicing_done_items',
                localField: 'slicing_done_other_details_id',
                foreignField: 'slicing_done_other_details_id',
                as: '_batch_siblings',
              },
            },
            {
              $addFields: {
                item_cmt: {
                  $let: {
                    vars: {
                      raw: { $ifNull: ['$cmt', 0] },
                      total: {
                        $ifNull: [
                          '$slicing_done_other_details.total_cmt',
                          0,
                        ],
                      },
                      cnt: {
                        $size: { $ifNull: ['$_batch_siblings', []] },
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: ['$$raw', 0] },
                        '$$raw',
                        {
                          $cond: [
                            {
                              $and: [
                                { $gt: ['$$total', 0] },
                                { $gt: ['$$cnt', 0] },
                              ],
                            },
                            { $divide: ['$$total', '$$cnt'] },
                            0,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              $lookup: {
                from: 'issued_for_slicings',
                localField: 'slicing_done_other_details.issue_for_slicing_id',
                foreignField: '_id',
                as: 'issued_for_slicing',
              },
            },
            {
              $unwind: {
                path: '$issued_for_slicing',
                preserveNullAndEmptyArrays: true,
              },
            },
            { $project: { _batch_siblings: 0 } },
          ])
        : [];

      const allLeafCodes = [
        ...new Set([
          ...slicingItems.map((s) => s.log_no_code),
          ...peelingItems.map((p) => p.log_no_code),
        ]),
      ];

      const [dressingItems, smokingItems, groupingItems] =
        await Promise.all([
          allLeafCodes.length
            ? dressing_done_items_model
                .find({ log_no_code: { $in: allLeafCodes } })
                .lean()
            : [],
          allLeafCodes.length
            ? process_done_items_details_model
                .find({ log_no_code: { $in: allLeafCodes } })
                .lean()
            : [],
          allLeafCodes.length
            ? grouping_done_items_details_model
                .find({ log_no_code: { $in: allLeafCodes } })
                .lean()
            : [],
        ]);

      const groupNos = [
        ...new Set(groupingItems.map((g) => g.group_no)),
      ];

      // Run tapping and pressing-consumed lookup in parallel
      const [tappingRaw, pressingConsumedLinks] = await Promise.all([
        groupNos.length
          ? tapping_done_items_details_model.aggregate([
              { $match: { group_no: { $in: groupNos } } },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'tapping_details',
                },
              },
              {
                $unwind: {
                  path: '$tapping_details',
                  preserveNullAndEmptyArrays: true,
                },
              },
            ])
          : [],
        // Find every pressing run that consumed sheets from any of our groups.
        // pressing_done_consumed_items_details.group_details[].group_no is the
        // string group number (matches grouping_done_items_details.group_no).
        // This handles both single-group and multi-group pressing runs,
        // unlike pressing_done_details.group_no which only stores the PRIMARY group.
        groupNos.length
          ? pressing_done_consumed_items_details_model.aggregate([
              { $match: { 'group_details.group_no': { $in: groupNos } } },
              { $unwind: '$group_details' },
              { $match: { 'group_details.group_no': { $in: groupNos } } },
              {
                $project: {
                  pressing_done_details_id: 1,
                  group_no: '$group_details.group_no',
                },
              },
            ])
          : [],
      ]);

      // Deduplicate pressing_done_details ObjectIds (keep as ObjectId instances)
      const uniquePressingDetailIds = [
        ...new Map(
          pressingConsumedLinks.map((r) => [
            String(r.pressing_done_details_id),
            r.pressing_done_details_id,
          ])
        ).values(),
      ];

      // Fetch the actual pressing output records
      const pressingItems = uniquePressingDetailIds.length > 0
        ? await pressing_done_details_model
            .find({ _id: { $in: uniquePressingDetailIds } })
            .lean()
        : [];

      // ── History-based queries for issue tracking ─────────────────────────
      const groupingItemIds = groupingItems.map((g) => g._id).filter(Boolean);
      const groupingIssuedForAgg =
        groupingItemIds.length > 0
          ? await grouping_done_history_model.aggregate([
              { $match: { grouping_done_item_id: { $in: groupingItemIds } } },
              { $sort: { updatedAt: -1 } },
              {
                $group: {
                  _id: '$grouping_done_item_id',
                  issued_for: { $first: '$issued_for' },
                  issue_status: { $first: '$issue_status' },
                  order_id: { $first: '$order_id' },
                },
              },
            ])
          : [];
      const groupingIssuedForByItemId = new Map(
        groupingIssuedForAgg.map((r) => [String(r._id), r.issued_for || ''])
      );
      const groupingIssueStatusByItemId = new Map(
        groupingIssuedForAgg.map((r) => [String(r._id), r.issue_status || ''])
      );
      const groupingOrderIdByItemId = new Map(
        groupingIssuedForAgg
          .filter((r) => r.order_id)
          .map((r) => [String(r._id), r.order_id])
      );

      const tappingItemIds = tappingRaw.map((t) => t._id).filter(Boolean);
      const tappingHistoryAgg =
        tappingItemIds.length > 0
          ? await tapping_done_history_model.aggregate([
              { $match: { tapping_done_item_id: { $in: tappingItemIds } } },
              { $sort: { updatedAt: -1 } },
              {
                $group: {
                  _id: '$tapping_done_item_id',
                  issue_status: { $first: '$issue_status' },
                  issued_for: { $first: '$issued_for' },
                  order_id: { $first: '$order_id' },
                },
              },
            ])
          : [];
      const tappingIssueStatusByItemId = new Map(
        tappingHistoryAgg.map((r) => [
          String(r._id),
          formatTappingPressingIssueLabel(r.issue_status, r.issued_for),
        ])
      );
      const tappingOrderIdByItemId = new Map(
        tappingHistoryAgg
          .filter((r) => r.order_id)
          .map((r) => [String(r._id), r.order_id])
      );

      const pressingDetailIds = pressingItems.map((p) => p._id).filter(Boolean);
      const pressingHistoryAgg =
        pressingDetailIds.length > 0
          ? await pressing_done_history_model.aggregate([
              { $match: { issued_item_id: { $in: pressingDetailIds } } },
              { $sort: { updatedAt: -1 } },
              {
                $group: {
                  _id: '$issued_item_id',
                  issued_sheets: { $sum: '$no_of_sheets' },
                  issued_sqm: { $sum: '$sqm' },
                  issue_status: { $first: '$issue_status' },
                  issued_for: { $first: '$issued_for' },
                  order_id: { $first: '$order_id' },
                },
              },
            ])
          : [];
      const pressingIssuedSheetsByItemId = new Map(
        pressingHistoryAgg.map((r) => [String(r._id), r.issued_sheets || 0])
      );
      const pressingIssuedSqmByItemId = new Map(
        pressingHistoryAgg.map((r) => [String(r._id), r.issued_sqm || 0])
      );
      const pressingIssueStatusByItemId = new Map(
        pressingHistoryAgg.map((r) => [
          String(r._id),
          formatPressingIssueLabel(r.issue_status, r.issued_for),
        ])
      );
      const pressingOrderIdByItemId = new Map(
        pressingHistoryAgg
          .filter((r) => r.order_id)
          .map((r) => [String(r._id), r.order_id])
      );

      const pressingIds = pressingItems.map((p) => p._id);
      const [cncItems, colourItems] = await Promise.all([
        pressingIds.length
          ? cnc_done_details_model
              .find({ pressing_details_id: { $in: pressingIds } })
              .lean()
          : [],
        pressingIds.length
          ? color_done_details_model
              .find({ pressing_details_id: { $in: pressingIds } })
              .lean()
          : [],
      ]);

      // ── CNC + Colour order history (parallel) ────────────────────────────────
      const cncItemIds = cncItems.map((c) => c._id).filter(Boolean);
      const colourItemIds = colourItems.map((c) => c._id).filter(Boolean);
      const [cncHistoryAgg, colourHistoryAgg] = await Promise.all([
        cncItemIds.length
          ? cnc_history_model.aggregate([
              { $match: { issued_item_id: { $in: cncItemIds } } },
              { $sort: { updatedAt: -1 } },
              {
                $group: {
                  _id: '$issued_item_id',
                  order_id: { $first: '$order_id' },
                },
              },
            ])
          : [],
        colourItemIds.length
          ? color_history_model.aggregate([
              { $match: { issued_item_id: { $in: colourItemIds } } },
              { $sort: { updatedAt: -1 } },
              {
                $group: {
                  _id: '$issued_item_id',
                  order_id: { $first: '$order_id' },
                },
              },
            ])
          : [],
      ]);
      const cncOrderIdByItemId = new Map(
        cncHistoryAgg
          .filter((r) => r.order_id)
          .map((r) => [String(r._id), r.order_id])
      );
      const colourOrderIdByItemId = new Map(
        colourHistoryAgg
          .filter((r) => r.order_id)
          .map((r) => [String(r._id), r.order_id])
      );

      // ── Bulk-fetch orders for all order_ids found across all stages ──────────
      const allOrderIds = [
        ...new Set([
          ...groupingOrderIdByItemId.values(),
          ...tappingOrderIdByItemId.values(),
          ...pressingOrderIdByItemId.values(),
          ...cncOrderIdByItemId.values(),
          ...colourOrderIdByItemId.values(),
        ].map(String)),
      ];
      const orderDocs = allOrderIds.length
        ? await OrderModel
            .find(
              { _id: { $in: allOrderIds } },
              { order_no: 1, orderDate: 1, owner_name: 1 }
            )
            .lean()
        : [];
      const orderById = new Map(orderDocs.map((o) => [String(o._id), o]));

      const orderMaps = {
        groupingOrderIdByItemId,
        tappingOrderIdByItemId,
        pressingOrderIdByItemId,
        cncOrderIdByItemId,
        colourOrderIdByItemId,
        orderById,
      };

      // ── Step 3: Build lookup maps ─────────────────────────────────────────
      const crosscutsByLogNo = groupByKey(crosscuts, 'log_no');
      const flitchesByCrosscutId = groupByKey(
        flitches.filter((f) => f.crosscut_done_id),
        (f) => String(f.crosscut_done_id)
      );
      const flitchesByLogInventoryItemId = groupByKey(
        flitches,
        (f) => String(f.log_inventory_item_id)
      );
      // slicingItems keyed by log_no (= flitch code, e.g. "L2105A1")
      const slicingByFlitchCode = groupByKey(slicingItems, 'log_no');
      const peelingByLogNo = groupByKey(peelingItems, 'log_no');
      const dressingByCode = groupByKey(dressingItems, 'log_no_code');
      const smokingByCode = groupByKey(smokingItems, 'log_no_code');
      const groupingByCode = groupByKey(groupingItems, 'log_no_code');
      const tappingByGroupNo = groupByKey(tappingRaw, 'group_no');

      // Build pressingByGroupNo from the consumed-items link so that EVERY group
      // involved in a pressing run (not just the primary group_no) gets credited.
      const pressingById = new Map(pressingItems.map((p) => [String(p._id), p]));
      const pressingByGroupNo = new Map();
      for (const link of pressingConsumedLinks) {
        const groupNo = link.group_no;
        const pressingDetail = pressingById.get(String(link.pressing_done_details_id));
        if (!pressingDetail) continue;
        if (!pressingByGroupNo.has(groupNo)) pressingByGroupNo.set(groupNo, []);
        const list = pressingByGroupNo.get(groupNo);
        // avoid adding the same pressing record twice for the same group
        if (!list.find((p) => String(p._id) === String(pressingDetail._id))) {
          list.push(pressingDetail);
        }
      }

      const cncByPressingId = groupByKey(cncItems, (c) => String(c.pressing_details_id));
      const colourByPressingId = groupByKey(colourItems, (c) => String(c.pressing_details_id));

      // ── Step 3_DEBUG: Log flitch/slicing data for troubleshooting ──────────────────────────────────
      console.log(
        'DEBUG [Slicing Query]',
        `flitchLogNoCodes: ${flitchLogNoCodes.length}, slicingItems: ${slicingItems.length}, slicingByFlitchCode size: ${slicingByFlitchCode.size}`
      );
      if (slicingItems.length > 0) {
        console.log('DEBUG [Slicing Details - First 3]:');
        slicingItems.slice(0, 3).forEach((s, i) => {
          console.log(
            `  Slicing ${i}: log_no="${s.log_no}", log_no_code="${s.log_no_code}"`
          );
        });
      } else {
        console.log('DEBUG [No slicing items found - check flitchLogNoCodes]');
      }

      // DEBUG: Log flitch data for troubleshooting
      console.log(
        'DEBUG [Flitch Query]',
        `Total logs: ${logs.length}, Total flitches fetched: ${flitches.length}`
      );
      if (flitches.length > 0) {
        console.log('DEBUG [Flitch Details]');
        flitches.slice(0, 3).forEach((f, i) => {
          console.log(`  Flitch ${i}: log_no="${f.log_no}", log_no_code="${f.log_no_code}", flitch_cmt=${f.flitch_cmt}, issue_status="${f.issue_status}", crosscut_done_id=${f.crosscut_done_id}`);
        });
      } else {
        console.log('DEBUG [No flitches found in database]');
      }

      console.log(
        'DEBUG [Flitch Maps]',
        `flitchesByCrosscutId: ${flitchesByCrosscutId.size}, flitchesByLogInventoryItemId: ${flitchesByLogInventoryItemId.size}`
      );
      if (flitchesByLogInventoryItemId.size > 0) {
        console.log('DEBUG [Flitches by log inventory item ID]:');
        [...flitchesByLogInventoryItemId.entries()].slice(0, 3).forEach(([logId, items]) => {
          console.log(`  Log ID ${logId}: ${items.length} flitch(es)`);
        });
      }

      // ── Step 3 PRESSING DEBUG ─────────────────────────────────────────────
      console.log(
        'DEBUG [Pressing Data]',
        `groupingItems: ${groupingItems.length}, groupNos: ${groupNos.length}, pressingConsumedLinks: ${pressingConsumedLinks.length}, pressingItems: ${pressingItems.length}`
      );
      if (pressingItems.length > 0) {
        console.log('DEBUG [Pressing Details - First 3]:');
        pressingItems.slice(0, 3).forEach((p, i) => {
          console.log(`  Pressing ${i}: group_no="${p.group_no}", _id="${p._id}", no_of_sheets=${p.no_of_sheets}, sqm=${p.sqm}`);
        });
      } else {
        console.log('DEBUG [No pressing items found via consumed_items_details]');
      }

      console.log(
        'DEBUG [Pressing Maps]',
        `pressingByGroupNo size: ${pressingByGroupNo.size}, cncByPressingId size: ${cncByPressingId.size}, colourByPressingId size: ${colourByPressingId.size}`
      );
      if (pressingByGroupNo.size > 0) {
        console.log('DEBUG [Pressing by group number]:');
        [...pressingByGroupNo.entries()].slice(0, 3).forEach(([groupNo, items]) => {
          console.log(`  Group ${groupNo}: ${items.length} pressing item(s)`);
        });
      }

      // ── Step 3b: Helper function to get issued_for_cmt from log ────────────
      // Column 5 uses log.issue_status to determine which process it was issued for
      // and log.physical_cmt as the CMT quantity for that issuance
      const getIssuedForCmt = (issueStatus, physicalCmt) => {
        // If log has an issue_status, it means it was issued for that process
        // with the complete physical_cmt as the issue amount
        if (issueStatus === 'crosscutting' || issueStatus === 'flitching' || issueStatus === 'peeling') {
          return physicalCmt || 0;
        }
        // For now, log with no issue_status means not yet issued
        return null;
      };

      // ── Step 4: Build flat hierarchical rows ──────────────────────────────
      const allRows = [];

      for (const log of logs) {
        const logNo = log.log_no;
        const issuedForCmt = getIssuedForCmt(
          log.issue_status,
          log.physical_cmt
        );
        const logBase = {
          item_name: log.item_name || '',
          log_no: logNo,
          indian_cmt: log.indian_cmt ?? '',
          rece_cmt: log.physical_cmt ?? '',
          inward_issue_for: issuedForCmt ?? '',
          inward_issue_status: log.issue_status || '',
        };

        const crosscutsForLog = crosscutsByLogNo.get(logNo) || [];
        const flitchesForLog = flitchesByLogInventoryItemId.get(String(log._id)) || [];
        const peelingForLog = peelingByLogNo.get(logNo) || [];

        // DEBUG: Log flitch availability per log
        if (flitchesForLog.length > 0) {
          console.log(
            `DEBUG [Log ${logNo}] Has ${flitchesForLog.length} direct flitches`,
            flitchesForLog.map((f) => ({
              log_no_code: f.log_no_code,
              flitch_cmt: f.flitch_cmt,
              issue_status: f.issue_status,
            }))
          );
        }

        if (crosscutsForLog.length > 0) {
          // Log went through crosscutting
          // Track which flitches are linked to a crosscut
          const linkedFlitchIds = new Set();

          for (const cc of crosscutsForLog) {
            const ccFp = crosscutIssueForFlitchPeeling(cc);
            const ccBase = {
              cc_log_no: cc.log_no_code,
              cc_rec: cc.crosscut_cmt || '',
              cc_issue_for: ccFp.issue_for,
              cc_status: ccFp.status,
            };

            const flitchesForCc =
              flitchesByCrosscutId.get(String(cc._id)) || [];

            if (flitchesForCc.length > 0) {
              for (const flitch of flitchesForCc) {
                linkedFlitchIds.add(String(flitch._id));
                allRows.push(
                  ...buildFlitchRows(
                    logBase,
                    ccBase,
                    flitch,
                    slicingByFlitchCode,
                    peelingByLogNo,
                    dressingByCode,
                    smokingByCode,
                    groupingByCode,
                    tappingByGroupNo,
                    pressingByGroupNo,
                    cncByPressingId,
                    colourByPressingId,
                    groupingIssuedForByItemId,
                    tappingIssueStatusByItemId,
                    pressingIssuedSheetsByItemId,
                    pressingIssuedSqmByItemId,
                    pressingIssueStatusByItemId,
                    groupingIssueStatusByItemId,
                    orderMaps
                  )
                );
              }
            } else if (cc.issue_status === 'peeling') {
              // Crosscut went directly to peeling
              const ccPattern = buildChildPattern(cc.log_no_code);
              const peelingForCc = peelingForLog.filter((p) =>
                ccPattern.test(p.log_no_code)
              );

              if (peelingForCc.length > 0) {
                for (const peel of peelingForCc) {
                  allRows.push(
                    buildPeelingRow(
                      logBase,
                      ccBase,
                      emptyFlitch(),
                      peel,
                      dressingByCode,
                      smokingByCode,
                      groupingByCode,
                      tappingByGroupNo,
                      pressingByGroupNo,
                      cncByPressingId,
                      colourByPressingId,
                      groupingIssuedForByItemId,
                      tappingIssueStatusByItemId,
                      pressingIssuedSheetsByItemId,
                      pressingIssuedSqmByItemId,
                      pressingIssueStatusByItemId,
                      groupingIssueStatusByItemId,
                      orderMaps
                    )
                  );
                }
              } else {
                allRows.push({
                  ...logBase,
                  ...ccBase,
                  ...emptyFlitch(),
                  ...emptySlicing(),
                  ...emptyPeeling(),
                  ...emptyDressing(),
                  ...emptySmoking(),
                  ...emptyDownstream(),
                });
              }
            } else {
              // Crosscut not yet processed further
              allRows.push({
                ...logBase,
                ...ccBase,
                ...emptyFlitch(),
                ...emptySlicing(),
                ...emptyPeeling(),
                ...emptyDressing(),
                ...emptySmoking(),
                ...emptyDownstream(),
              });
            }
          }

          // Also process direct flitches (not linked to any crosscut)
          const directFlitches = flitchesForLog.filter(
            (f) => !linkedFlitchIds.has(String(f._id))
          );
          if (directFlitches.length > 0) {
            const ccBase = {
              cc_log_no: '',
              cc_rec: '',
              cc_issue_for: '',
              cc_status: '',
            };
            for (const flitch of directFlitches) {
              allRows.push(
                ...buildFlitchRows(
                  logBase,
                  ccBase,
                  flitch,
                  slicingByFlitchCode,
                  peelingByLogNo,
                  dressingByCode,
                  smokingByCode,
                  groupingByCode,
                  tappingByGroupNo,
                  pressingByGroupNo,
                  cncByPressingId,
                  colourByPressingId,
                  groupingIssuedForByItemId,
                  tappingIssueStatusByItemId,
                  pressingIssuedSheetsByItemId,
                  pressingIssuedSqmByItemId,
                  pressingIssueStatusByItemId,
                  groupingIssueStatusByItemId,
                  orderMaps
                )
              );
            }
          }
        } else if (flitchesForLog.length > 0) {
          // Log went directly to flitching (no crosscut)
          const ccBase = {
            cc_log_no: '',
            cc_rec: '',
            cc_issue_for: '',
            cc_status: '',
          };
          for (const flitch of flitchesForLog) {
            allRows.push(
              ...buildFlitchRows(
                logBase,
                ccBase,
                flitch,
                slicingByFlitchCode,
                peelingByLogNo,
                dressingByCode,
                smokingByCode,
                groupingByCode,
                tappingByGroupNo,
                pressingByGroupNo,
                cncByPressingId,
                colourByPressingId,
                groupingIssuedForByItemId,
                tappingIssueStatusByItemId,
                pressingIssuedSheetsByItemId,
                pressingIssuedSqmByItemId,
                pressingIssueStatusByItemId,
                groupingIssueStatusByItemId,
                orderMaps
              )
            );
          }
        } else if (peelingForLog.length > 0) {
          // Log went directly to peeling (no crosscut, no flitch)
          const ccBase = {
            cc_log_no: '',
            cc_rec: '',
            cc_issue_for: '',
            cc_status: '',
          };
          for (const peel of peelingForLog) {
            allRows.push(
              buildPeelingRow(
                logBase,
                ccBase,
                null,
                peel,
                dressingByCode,
                smokingByCode,
                groupingByCode,
                tappingByGroupNo,
                pressingByGroupNo,
                cncByPressingId,
                colourByPressingId,
                groupingIssuedForByItemId,
                tappingIssueStatusByItemId,
                pressingIssuedSheetsByItemId,
                pressingIssuedSqmByItemId,
                pressingIssueStatusByItemId,
                groupingIssueStatusByItemId,
                orderMaps
              )
            );
          }
        } else {
          // No further processing recorded yet
          allRows.push({
            ...logBase,
            cc_log_no: '',
            cc_rec: '',
            cc_issue_for: '',
            cc_status: '',
            ...emptyFlitch(),
            ...emptySlicing(),
            ...emptyPeeling(),
            ...emptyDressing(),
            ...emptySmoking(),
            ...emptyDownstream(),
          });
        }
      }

      if (!allRows.length) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              404,
              'No log data found for the selected period'
            )
          );
      }

      const excelLink = await createLogItemFurtherProcessReportExcel(
        allRows,
        startDate,
        endDate,
        filter
      );

      return res.json(
        new ApiResponse(
          200,
          'Log item further process report generated successfully',
          excelLink
        )
      );
    } catch (error) {
      console.error(
        'Error generating log item further process report:',
        error
      );
      return next(
        new ApiError(error.message || 'Failed to generate report', 500)
      );
    }
  }
);
