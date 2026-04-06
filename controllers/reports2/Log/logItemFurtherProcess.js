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
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { color_done_details_model } from '../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import { issued_for_slicing_model } from '../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
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

// Build regex pattern: code followed by one or more capital letters, end of string
// e.g. flitch_code "L0702A1" → /^L0702A1[A-Z]+$/
// Correctly distinguishes L0702A1A (matches) from L0702A10A (does NOT match for parent L0702A1
// because "10" has a digit after the base code)
const buildChildPattern = (code) => {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}[A-Z0-9]+$`);
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

/** Flitch Issue in(CMT) — cols 13–14: Issue For Slicing/Peeling + Status. */
const flitchIssueForSlicingPeeling = (f) => {
  if (!f || !f.issue_status) return { issue_for: '', status: '' };
  const s = String(f.issue_status).toLowerCase();
  if (s === 'slicing' || s === 'slicing_peeling' || s === 'peeling') {
    return { issue_for: f.flitch_cmt ?? 0, status: f.issue_status };
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

function formatGroupingIssueLabel(issueStatus, issuedFor) {
  if (!issueStatus && !issuedFor) return '';
  const stage = issueStatus ? String(issueStatus).trim() : '';
  const dest = issuedFor ? String(issuedFor).trim() : '';
  if (stage && dest) return `${stage} / ${dest}`;
  return stage || dest;
}

function resolveGroupingIssueStatusFromHistory(groupItem, groupingIssueStatusByItemId) {
  if (!groupItem || !groupingIssueStatusByItemId?.size) return '';
  return groupingIssueStatusByItemId.get(String(groupItem._id)) || '';
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

function buildGroupingData(groupItem, ctx) {
  const groupNo = groupItem.group_no;
  const recSheets = groupItem.no_of_sheets || 0;
  const recSqm = groupItem.sqm || 0;
  const availSheets = getVal(groupItem, 'available_details.no_of_sheets') ?? recSheets;
  const availSqm = getVal(groupItem, 'available_details.sqm') ?? recSqm;
  const issueSheets = Math.max(0, recSheets - availSheets);
  const issueSqm = Math.max(0, recSqm - availSqm);

  const tappingItems = ctx.tappingByGroupNo.get(groupNo) || [];
  const machineItems = tappingItems.filter((t) => {
    const st = String(getVal(t, 'tapping_details.splicing_type') || '').toUpperCase();
    return st.includes('MACHINE');
  });
  const handItems = tappingItems.filter((t) => {
    const st = String(getVal(t, 'tapping_details.splicing_type') || '').toUpperCase();
    return st.includes('HAND');
  });
  
  const machineSqm = sumField(machineItems, 'sqm');
  const handSqm = sumField(handItems, 'sqm');
  const splicingSheets = sumField(tappingItems, 'no_of_sheets');
  const splicingAvailSheets = sumField(tappingItems, 'available_details.no_of_sheets');
  const splicingAvailSqm = sumField(tappingItems, 'available_details.sqm');
  
  const splicingIssueSheets = Math.max(0, splicingSheets - splicingAvailSheets);
  const splicingIssueStatus = resolveSplicingIssueStatusFromHistory(tappingItems, ctx.tappingIssueStatusByItemId);

  const pressingItems = ctx.pressingByGroupNo.get(groupNo) || [];
  const pressingSheets = sumField(pressingItems, 'no_of_sheets');
  const pressingSqm = sumField(pressingItems, 'sqm');
  const pressingAvailSheets = sumField(pressingItems, 'available_details.no_of_sheets');
  const pressingAvailSqm = sumField(pressingItems, 'available_details.sqm');
  const pressingIssueSheets = pressingItems.reduce((acc, p) => acc + (ctx.pressingIssuedSheetsByItemId.get(String(p._id)) ?? 0), 0);
  const pressingIssueSqm = pressingItems.reduce((acc, p) => acc + (ctx.pressingIssuedSqmByItemId.get(String(p._id)) ?? 0), 0);
  const pressingIssueStatus = resolvePressingIssueStatusFromHistory(pressingItems, ctx.pressingIssueStatusByItemId);

  const pressingIds = pressingItems.map((p) => String(p._id));
  const cncItems = pressingIds.flatMap((id) => ctx.cncByPressingId.get(id) || []);
  const colourItems = pressingIds.flatMap((id) => ctx.colourByPressingId.get(id) || []);

  return {
    grouping_new_group_no: groupNo,
    grouping_rec_sheets: recSheets,
    grouping_rec_sqm: recSqm,
    grouping_issue_sheets: issueSheets,
    grouping_issue_sqm: issueSqm,
    grouping_issue_status: resolveGroupingIssueStatusFromHistory(groupItem, ctx.groupingIssuedForByItemId),
    grouping_balance_sheets: availSheets,
    grouping_balance_sqm: availSqm,
    splicing_rec_machine_sqm: machineSqm,
    splicing_rec_hand_sqm: handSqm,
    splicing_sheets: splicingSheets,
    splicing_rec_leaf: sumField(tappingItems, 'no_of_sheets'),
    splicing_balance_sheets: splicingAvailSheets,
    splicing_balance_sqm: splicingAvailSqm,
    splicing_issue_sheets: splicingIssueSheets,
    splicing_issue_status: splicingIssueStatus,
    pressing_sheets: pressingSheets,
    pressing_sqm: pressingSqm,
    pressing_issue_sheets: pressingIssueSheets,
    pressing_issue_sqm: pressingIssueSqm,
    pressing_issue_status: pressingIssueStatus,
    pressing_balance_sheets: pressingAvailSheets,
    pressing_balance_sqm: pressingAvailSqm,
    cnc_type: cncItems[0]?.product_type || '',
    cnc_rec_sheets: sumField(cncItems, 'no_of_sheets'),
    colour_rec_sheets: sumField(colourItems, 'no_of_sheets'),
  };
}

function getDressingData(logNoCode, dressingByCode) {
  const items = dressingByCode.get(logNoCode) || [];
  if (!items.length) return emptyDressing();
  return {
    dress_rec_sqm: sumField(items, 'sqm'),
    dress_issue_sqm: sumField(items.filter((d) => d.issue_status), 'sqm'),
    dress_issue_status: items.find((d) => d.issue_status)?.issue_status || '',
  };
}

function getSmokingData(logNoCode, smokingByCode) {
  const items = smokingByCode.get(logNoCode) || [];
  if (!items.length) return emptySmoking();
  return {
    smoking_process: items.map((s) => s.process_name).filter(Boolean)[0] || '',
    smoking_issue_sqm: sumField(items, 'sqm'),
    smoking_issue_status: items.find((s) => s.issue_status)?.issue_status || '',
  };
}

function buildSlicingSideRows(logBase, ccBase, flitchBase, side, ctx) {
  const flitchId = String(side.flitching_done_id);
  const sideCode = side.log_no_code;
  const slicingBase = {
    slicing_side: sideCode,
    slicing_process_cmt: side.slicing_cmt ?? 0,
    slicing_balance_cmt: side.slicing_balance_cmt ?? 0,
    slicing_rec_leaf: side.no_of_leaves ?? 0,
    slicing_balance_leaf: getVal(side, 'available_details.no_of_leaves') ?? 0,
    slicing_balance_sqm: getVal(side, 'available_details.sqm') ?? 0,
  };

  const dressingData = getDressingData(sideCode, ctx.dressingByCode);
  const smokingData = getSmokingData(sideCode, ctx.smokingByCode);
  const groupingItems = ctx.groupingByCode.get(sideCode) || [];

  // Check if dressing/grouping at this code was issued for order
  const dressingLevelSales = ctx.salesCmtByDressingCode.get(sideCode) || '';

  if (groupingItems.length > 0) {
    return groupingItems.map((g) => {
      const row = {
        ...logBase,
        ...ccBase,
        ...flitchBase,
        ...slicingBase,
        ...emptyPeeling(),
        ...dressingData,
        ...smokingData,
        ...buildGroupingData(g, ctx),
      };
      // Apply dressing-level sales if no log/cc/flitch level sales exist
      if (!row.sales_cmt_sqm && dressingLevelSales) row.sales_cmt_sqm = dressingLevelSales;
      return row;
    });
  }

  const row = {
    ...logBase,
    ...ccBase,
    ...flitchBase,
    ...slicingBase,
    ...emptyPeeling(),
    ...dressingData,
    ...smokingData,
    ...emptyDownstream(),
  };
  // Apply dressing-level sales if no log/cc/flitch level sales exist
  if (!row.sales_cmt_sqm && dressingLevelSales) row.sales_cmt_sqm = dressingLevelSales;
  return [row];
}

function buildPeelingRow(logBase, ccBase, flitchBase, peel, ctx) {
  const peelingCode = peel.log_no_code;
  const peelingData = {
    ...emptySlicing(),
    peeling_process: peel.peeling_cmt ?? 0,
    peeling_balance_rostroller: peel.peeling_balance_rostroller ?? 0,
    peeling_output: peel.output_type || '',
    peeling_rec_leaf: peel.no_of_leaves ?? 0,
  };

  const resolvedFlitch = flitchBase || emptyFlitch();
  const dressingData = getDressingData(peelingCode, ctx.dressingByCode);
  const smokingData = getSmokingData(peelingCode, ctx.smokingByCode);
  const groupingItems = ctx.groupingByCode.get(peelingCode) || [];

  // Check if dressing/grouping at this code was issued for order
  const dressingLevelSales = ctx.salesCmtByDressingCode.get(peelingCode) || '';

  if (groupingItems.length > 0) {
    return groupingItems.map((g) => {
      const row = {
        ...logBase,
        ...ccBase,
        ...resolvedFlitch,
        ...peelingData,
        ...dressingData,
        ...smokingData,
        ...buildGroupingData(g, ctx),
      };
      if (!row.sales_cmt_sqm && dressingLevelSales) row.sales_cmt_sqm = dressingLevelSales;
      return row;
    });
  }

  const row = {
    ...logBase,
    ...ccBase,
    ...resolvedFlitch,
    ...peelingData,
    ...dressingData,
    ...smokingData,
    ...emptyDownstream(),
  };
  if (!row.sales_cmt_sqm && dressingLevelSales) row.sales_cmt_sqm = dressingLevelSales;
  return [row];
}

function buildFlitchRows(logBase, ccBase, flitch, ctx) {
  const flitchCode = flitch.log_no_code ?? flitch.flitch_code ?? '';
  // Lookup by log_no_code only (flitch_code is a short suffix like 'A1' that collides across logs)
  const flitchSales = ctx.salesCmtByFlitchCode.get(flitch.log_no_code) || '';
  const flitchChallanFromMap = ctx.challanCmtByFlitchCode.get(flitch.log_no_code) || '';
  const flitchChallan = flitchChallanFromMap || (String(flitch.issue_status).toLowerCase().includes('challan') ? (flitch.flitch_cmt ?? 0) : '');

  const flitchBase = {
    flitch_no: flitchCode,
    flitch_rec: flitch.flitch_cmt ?? 0,
    flitch_issue_for: flitch.flitch_cmt ?? 0,
    flitch_status: flitch.issue_status ?? '',
  };

  // Resolve sales & challan: flitch-level > crosscut-level > log-level
  const resolvedSales = flitchSales || ccBase.sales_cmt_sqm || logBase.sales_cmt_sqm || '';
  const resolvedChallan = flitchChallan || ccBase.challan_cmt_sqm || logBase.challan_cmt_sqm || '';

  // ID-BASED MAPPING for Slicing from Flitch
  const slicingSides = ctx.slicingByFlitchId.get(String(flitch._id)) || [];

  const rows = [];
  for (const side of slicingSides) {
    const sideRows = buildSlicingSideRows(logBase, ccBase, flitchBase, side, ctx);
    // Apply sales & challan AFTER all spreads so emptyDownstream() can't overwrite
    for (const r of sideRows) {
      if (!r.sales_cmt_sqm) r.sales_cmt_sqm = resolvedSales;
      if (!r.challan_cmt_sqm) r.challan_cmt_sqm = resolvedChallan;
    }
    rows.push(...sideRows);
  }

  if (!rows.length) {
    rows.push({
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...emptySlicing(),
      ...emptyPeeling(),
      ...emptyDressing(),
      ...emptySmoking(),
      ...emptyDownstream(),
      sales_cmt_sqm: resolvedSales,
      challan_cmt_sqm: resolvedChallan,
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
 * @route POST /api/V1/reports2/log/download-excel-log-item-further-process-report
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

      const logNoPrefixPatterns = logNos.map(no => `^${no.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      const logNoRegex = new RegExp(logNoPrefixPatterns.join('|'));

      // ── Step 2: Bulk-fetch Crosscuts and Flitches FIRST ──────────────────
      const [crosscuts, flitches] = await Promise.all([
        crosscutting_done_model.find({ log_no: logNoRegex, deleted_at: null }).lean(),
        flitching_done_model.find({ 
          log_inventory_item_id: { $in: logIds }, 
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
        }).lean(),
      ]);

      const ccIds = crosscuts.map(c => c._id).filter(Boolean);
      const flitchIds = flitches.map(f => f._id).filter(Boolean);

      // ── Step 3: Bulk-fetch Slicing and Peeling based on all parent IDs ──────
      const [slicingItems, peelingItems] = await Promise.all([
        // STABLE ID ENRICHMENT FOR SLICING (Broad Match)
        issued_for_slicing_model.aggregate([
          { 
            $match: { 
              $or: [
                { log_inventory_item_id: { $in: logIds } },
                { flitching_done_id: { $in: flitchIds } }
              ]
            } 
          },
          { $lookup: { from: 'slicing_done_other_details', localField: '_id', foreignField: 'issue_for_slicing_id', as: 'od' } },
          { $unwind: { path: '$od', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'slicing_done_items', localField: 'od._id', foreignField: 'slicing_done_other_details_id', as: 'items' } },
          { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'issue_for_slicing_available', localField: '_id', foreignField: 'issue_for_slicing_id', as: 'bal' } },
          { $unwind: { path: '$bal', preserveNullAndEmptyArrays: true } },
          { $project: { _id: { $ifNull: ['$items._id', '$_id'] }, log_no: { $ifNull: ['$items.log_no', '$log_no'] }, log_no_code: { $ifNull: ['$items.log_no_code', '$log_no_code'] }, thickness: { $ifNull: ['$items.thickness', 0] }, no_of_leaves: { $ifNull: ['$items.no_of_leaves', 0] }, available_details: '$items.available_details', grade_name: { $ifNull: ['$items.grade_name', ''] }, remark: { $ifNull: ['$items.remark', ''] }, slicing_cmt: { $ifNull: ['$od.total_cmt', '$cmt'] }, slicing_balance_cmt: '$bal.cmt', issue_type: '$type', issue_cmt: '$cmt', flitching_done_id: 1, log_inventory_item_id: 1 } }
        ]),
        // STABLE ID ENRICHMENT FOR PEELING (Broad Match)
        issues_for_peeling_model.aggregate([
          { 
            $match: { 
              $or: [
                { log_inventory_item_id: { $in: logIds } },
                { crosscut_done_id: { $in: ccIds } }
              ]
            } 
          },
          { $lookup: { from: 'peeling_done_other_details', localField: '_id', foreignField: 'issue_for_peeling_id', as: 'od' } },
          { $unwind: { path: '$od', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'peeling_done_items', localField: 'od._id', foreignField: 'peeling_done_other_details_id', as: 'items' } },
          { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'issues_for_peeling_available', localField: '_id', foreignField: 'issue_for_peeling_id', as: 'bal' } },
          { $unwind: { path: '$bal', preserveNullAndEmptyArrays: true } },
          { $project: { _id: { $ifNull: ['$items._id', '$_id'] }, log_no: { $ifNull: ['$items.log_no', '$log_no'] }, log_no_code: { $ifNull: ['$items.log_no_code', '$log_no_code'] }, thickness: { $ifNull: ['$items.thickness', 0] }, no_of_leaves: { $ifNull: ['$items.no_of_leaves', 0] }, grade_name: { $ifNull: ['$items.grade_name', ''] }, remark: { $ifNull: ['$items.remark', ''] }, output_type: { $ifNull: ['$items.output_type', ''] }, peeling_cmt: { $cond: { if: { $gt: [{ $ifNull: ['$od.total_cmt', 0] }, 0] }, then: '$od.total_cmt', else: { $ifNull: ['$cmt', 0] } } }, peeling_balance_rostroller: '$bal.cmt', issue_type: '$type', issue_cmt: { $ifNull: ['$cmt', 0] }, crosscut_done_id: 1, log_inventory_item_id: 1 } }
        ]),
      ]);

      const allLeafCodes = [...new Set([...slicingItems.map(s => s.log_no_code), ...peelingItems.map(p => p.log_no_code)])];

      const [dressingItems, smokingItems, groupingItems] = await Promise.all([
        allLeafCodes.length ? dressing_done_items_model.find({ log_no_code: { $in: allLeafCodes } }).lean() : [],
        allLeafCodes.length ? process_done_items_details_model.find({ log_no_code: { $in: allLeafCodes } }).lean() : [],
        allLeafCodes.length ? grouping_done_items_details_model.find({ log_no_code: { $in: allLeafCodes } }).lean() : [],
      ]);

      const groupNos = [...new Set(groupingItems.map((g) => g.group_no))];

      const [tappingRaw, pressingItems] = await Promise.all([
        groupNos.length ? tapping_done_items_details_model.aggregate([
          { $match: { group_no: { $in: groupNos } } },
          { $lookup: { from: 'tapping_done_other_details', localField: 'tapping_done_other_details_id', foreignField: '_id', as: 'tapping_details' } },
          { $unwind: { path: '$tapping_details', preserveNullAndEmptyArrays: true } },
        ]) : [],
        groupNos.length ? pressing_done_details_model.find({ group_no: { $in: groupNos } }).lean() : [],
      ]);

      // Map enrichment for history
      const groupingItemIds = groupingItems.map(g => g._id).filter(Boolean);
      const groupingIssuedForAgg = groupingItemIds.length ? await grouping_done_history_model.aggregate([
        { $match: { grouping_done_item_id: { $in: groupingItemIds } } },
        { $sort: { updatedAt: -1 } },
        { $group: { _id: '$grouping_done_item_id', issue_status: { $first: '$issue_status' }, issued_for: { $first: '$issued_for' } } },
      ]) : [];
      const groupingIssuedForByItemId = new Map(groupingIssuedForAgg.map(r => [String(r._id), formatGroupingIssueLabel(r.issue_status, r.issued_for)]));

      const tappingItemIds = tappingRaw.map(t => t._id).filter(Boolean);
      const tappingHistoryAgg = tappingItemIds.length ? await tapping_done_history_model.aggregate([
        { $match: { tapping_done_item_id: { $in: tappingItemIds } } },
        { $sort: { updatedAt: -1 } },
        { $group: { _id: '$tapping_done_item_id', issue_status: { $first: '$issue_status' }, issued_for: { $first: '$issued_for' } } },
      ]) : [];
      const tappingIssueStatusByItemId = new Map(tappingHistoryAgg.map(r => [String(r._id), formatTappingPressingIssueLabel(r.issue_status, r.issued_for)]));

      const pressingDetailIds = pressingItems.map(p => p._id).filter(Boolean);
      const pressingHistoryAgg = pressingDetailIds.length ? await pressing_done_history_model.aggregate([
        { $match: { issued_item_id: { $in: pressingDetailIds } } },
        { $sort: { updatedAt: -1 } },
        { $group: { _id: '$issued_item_id', issued_sheets: { $sum: '$no_of_sheets' }, issued_sqm: { $sum: '$sqm' }, issue_status: { $first: '$issue_status' }, issued_for: { $first: '$issued_for' } } },
      ]) : [];
      const pressingIssuedSheetsByItemId = new Map(pressingHistoryAgg.map(r => [String(r._id), r.issued_sheets || 0]));
      const pressingIssuedSqmByItemId = new Map(pressingHistoryAgg.map(r => [String(r._id), r.issued_sqm || 0]));
      const pressingIssueStatusByItemId = new Map(pressingHistoryAgg.map(r => [String(r._id), formatPressingIssueLabel(r.issue_status, r.issued_for)]));

      const pressingIds = pressingItems.map(p => p._id);
      const [cncItems, colourItems] = await Promise.all([
        pressingIds.length ? cnc_done_details_model.find({ pressing_details_id: { $in: pressingIds } }).lean() : [],
        pressingIds.length ? color_done_details_model.find({ pressing_details_id: { $in: pressingIds } }).lean() : [],
      ]);

      // ── Fetch Sales/Order data from issued_for_order_items ──────────────
      // This is the REAL source of truth for items issued for sales orders.
      // Include codes from ALL stages so we can match orders at any level
      const allLogNoCodes = [...new Set([
        ...logNos,
        ...crosscuts.map(c => c.log_no_code).filter(Boolean),
        ...flitches.map(f => f.log_no_code).filter(Boolean),
        ...allLeafCodes,   // slicing side + peeling codes (used by dressing/grouping)
      ])];
      const orderIssuedItems = allLogNoCodes.length ? await issue_for_order_model.find(
        {
          issued_from: { $in: ['LOG', 'CROSSCUTTING', 'FLITCH', 'FLITCHING_FACTORY', 'DRESSING_FACTORY', 'GROUPING_FACTORY'] },
          $or: [
            { 'item_details.log_no': { $in: logNos } },
            { 'item_details.log_no_code': { $in: allLogNoCodes } },
          ],
        },
        { issued_from: 1, item_details: 1 }
      ).lean() : [];

      console.log('=== SALES/ORDER DEBUG ===');
      console.log('Sales records found:', orderIssuedItems.length);

      // Build maps: log_no / log_no_code → CMT for each issued_from type
      const salesCmtByLogNo = new Map();       // LOG items
      const salesCmtByCcCode = new Map();       // CROSSCUTTING items
      const salesCmtByFlitchCode = new Map();   // FLITCH / FLITCHING_FACTORY items
      const salesCmtByDressingCode = new Map(); // DRESSING_FACTORY items (by log_no_code)
      for (const oi of orderIssuedItems) {
        const det = oi.item_details;
        if (!det) { console.log('  SKIP: no item_details for', oi._id); continue; }
        // Pick the best CMT/SQM field based on the stage
        let cmt = 0;
        if (oi.issued_from === 'LOG') cmt = parseFloat(det.physical_cmt ?? 0) || 0;
        else if (oi.issued_from === 'CROSSCUTTING') cmt = parseFloat(det.crosscut_cmt ?? 0) || 0;
        else if (oi.issued_from === 'FLITCH' || oi.issued_from === 'FLITCHING_FACTORY') cmt = parseFloat(det.flitch_cmt ?? 0) || 0;
        else if (oi.issued_from === 'DRESSING_FACTORY') cmt = parseFloat(det.sqm ?? 0) || 0;
        else if (oi.issued_from === 'GROUPING_FACTORY') cmt = parseFloat(det.issued_sqm ?? det.sqm ?? 0) || 0;
        else cmt = parseFloat(det.sqm ?? det.physical_cmt ?? det.cmt ?? 0) || 0;
        console.log(`  Sales record: issued_from=${oi.issued_from}, det.log_no=${det.log_no}, det.log_no_code=${det.log_no_code}, det.flitch_code=${det.flitch_code}, cmt=${cmt}, det.sqm=${det.sqm}, det.issued_sqm=${det.issued_sqm}, det.physical_cmt=${det.physical_cmt}, det.crosscut_cmt=${det.crosscut_cmt}, det.flitch_cmt=${det.flitch_cmt}`);
        if (oi.issued_from === 'LOG') {
          const key = det.log_no;
          if (key) salesCmtByLogNo.set(key, (salesCmtByLogNo.get(key) || 0) + cmt);
          console.log(`    LOG map: key=${key}, cmt=${cmt}`);
        } else if (oi.issued_from === 'CROSSCUTTING') {
          const key = det.log_no_code;
          if (key) salesCmtByCcCode.set(key, (salesCmtByCcCode.get(key) || 0) + cmt);
          console.log(`    CC map: key=${key}, cmt=${cmt}`);
        } else if (oi.issued_from === 'FLITCH' || oi.issued_from === 'FLITCHING_FACTORY') {
          const key = det.log_no_code;
          if (key) salesCmtByFlitchCode.set(key, (salesCmtByFlitchCode.get(key) || 0) + cmt);
          console.log(`    FLITCH map: key=${key}, cmt=${cmt}`);
        } else if (oi.issued_from === 'DRESSING_FACTORY') {
          const key = det.log_no_code;
          if (key) salesCmtByDressingCode.set(key, (salesCmtByDressingCode.get(key) || 0) + cmt);
          console.log(`    DRESSING map: key=${key}, cmt=${cmt}`);
        } else if (oi.issued_from === 'GROUPING_FACTORY') {
          // Grouping items may not have log_no_code; try grouping_no or log_no_code
          const key = det.log_no_code || det.group_no;
          if (key) salesCmtByDressingCode.set(key, (salesCmtByDressingCode.get(key) || 0) + cmt);
          console.log(`    GROUPING map: key=${key}, cmt=${cmt}`);
        }
      }
      console.log('salesCmtByLogNo:', Object.fromEntries(salesCmtByLogNo));
      console.log('salesCmtByCcCode:', Object.fromEntries(salesCmtByCcCode));
      console.log('salesCmtByFlitchCode:', Object.fromEntries(salesCmtByFlitchCode));
      console.log('salesCmtByDressingCode:', Object.fromEntries(salesCmtByDressingCode));
      console.log('=== END SALES/ORDER DEBUG ===');

      // ── Fetch Challan data from issue_for_challan_details ───────────────
      const challanIssuedItems = (logIds.length || allLogNoCodes.length) ? await issue_for_challan_model.find(
        {
          issued_from: { $in: ['LOG', 'CROSSCUTTING', 'FLITCHING_FACTORY'] },
          $or: [
            { 'issued_item_details.log_no': { $in: logNos } },
            { 'issued_item_details.log_no_code': { $in: allLogNoCodes } },
            { 'issued_item_details._id': { $in: logIds } },
          ],
        },
        { issued_from: 1, issued_item_details: 1 }
      ).lean() : [];
      console.log('=== CHALLAN DEBUG ===');
      console.log('Challan records found:', challanIssuedItems.length);
      console.log('Search logNos:', logNos);
      console.log('Search allLogNoCodes:', allLogNoCodes.slice(0, 10));

      const challanCmtByLogNo = new Map();
      const challanCmtByCcCode = new Map();
      const challanCmtByFlitchCode = new Map();
      for (const ci of challanIssuedItems) {
        const det = ci.issued_item_details;
        if (!det) { console.log('  SKIP: no issued_item_details for', ci._id); continue; }
        const cmt = parseFloat(det.flitch_cmt ?? det.crosscut_cmt ?? det.physical_cmt ?? det.cmt ?? 0) || 0;
        console.log(`  Challan record: issued_from=${ci.issued_from}, det.log_no=${det.log_no}, det.log_no_code=${det.log_no_code}, det.flitch_code=${det.flitch_code}, cmt=${cmt}, det.physical_cmt=${det.physical_cmt}, det.crosscut_cmt=${det.crosscut_cmt}, det.flitch_cmt=${det.flitch_cmt}`);
        if (ci.issued_from === 'LOG') {
          const key = det.log_no;
          if (key) challanCmtByLogNo.set(key, (challanCmtByLogNo.get(key) || 0) + cmt);
          console.log(`    LOG map: key=${key}, cmt=${cmt}`);
        } else if (ci.issued_from === 'CROSSCUTTING') {
          const key = det.log_no_code;
          if (key) challanCmtByCcCode.set(key, (challanCmtByCcCode.get(key) || 0) + cmt);
          console.log(`    CC map: key=${key}, cmt=${cmt}`);
        } else if (ci.issued_from === 'FLITCHING_FACTORY') {
          const key = det.log_no_code;
          if (key) challanCmtByFlitchCode.set(key, (challanCmtByFlitchCode.get(key) || 0) + cmt);
          console.log(`    FLITCH map: key=${key}, cmt=${cmt}`);
        }
      }
      console.log('challanCmtByLogNo:', Object.fromEntries(challanCmtByLogNo));
      console.log('challanCmtByCcCode:', Object.fromEntries(challanCmtByCcCode));
      console.log('challanCmtByFlitchCode:', Object.fromEntries(challanCmtByFlitchCode));
      console.log('=== END CHALLAN DEBUG ===');

      // ── Step 3: STABLE ID-BASED MAPS ────────────────────────────────────
      const ctx = {
        crosscutsByLogId: groupByKey(crosscuts, c => String(c.log_inventory_item_id)),
        flitchesByCrosscutId: groupByKey(flitches.filter(f => f.crosscut_done_id), f => String(f.crosscut_done_id)),
        flitchesByLogId: groupByKey(flitches, f => String(f.log_inventory_item_id)),
        slicingByFlitchId: groupByKey(slicingItems.filter(s => s.flitching_done_id), s => String(s.flitching_done_id)),
        peelingByCcId: groupByKey(peelingItems.filter(p => p.crosscut_done_id), p => String(p.crosscut_done_id)),
        peelingByLogId: groupByKey(peelingItems.filter(p => p.log_inventory_item_id && !p.crosscut_done_id), p => String(p.log_inventory_item_id)),
        dressingByCode: groupByKey(dressingItems, 'log_no_code'),
        smokingByCode: groupByKey(smokingItems, 'log_no_code'),
        groupingByCode: groupByKey(groupingItems, 'log_no_code'),
        tappingByGroupNo: groupByKey(tappingRaw, 'group_no'),
        pressingByGroupNo: groupByKey(pressingItems, 'group_no'),
        cncByPressingId: groupByKey(cncItems, (c) => String(c.pressing_details_id)),
        colourByPressingId: groupByKey(colourItems, (c) => String(c.pressing_details_id)),
        groupingIssuedForByItemId,
        tappingIssueStatusByItemId,
        pressingIssuedSheetsByItemId,
        pressingIssuedSqmByItemId,
        pressingIssueStatusByItemId,
        salesCmtByLogNo,
        salesCmtByCcCode,
        salesCmtByFlitchCode,
        salesCmtByDressingCode,
        challanCmtByLogNo,
        challanCmtByCcCode,
        challanCmtByFlitchCode,
      };

      const getIssuedForCmt = (issueStatus, physicalCmt) => {
        if (['crosscutting', 'flitching', 'peeling'].includes(issueStatus)) return physicalCmt || 0;
        return null;
      };

      // ── Step 4: Build hierarchical rows with stable ID mapping ───────────
      const allRows = [];
      for (const log of logs) {
        const logSales = ctx.salesCmtByLogNo.get(log.log_no) || '';
        // Challan: first try the map, then fall back to issue_status check
        const logChallanFromMap = ctx.challanCmtByLogNo.get(log.log_no) || '';
        const logChallan = logChallanFromMap || (String(log.issue_status).toLowerCase().includes('challan') ? (log.physical_cmt ?? 0) : '');
        const logBase = {
          item_name: log.item_name || '',
          log_no: log.log_no,
          indian_cmt: log.indian_cmt ?? 0,
          rece_cmt: log.physical_cmt ?? 0,
          inward_issue_for: getIssuedForCmt(log.issue_status, log.physical_cmt) ?? 0,
          inward_issue_status: log.issue_status || '',
          sales_cmt_sqm: logSales,
          challan_cmt_sqm: logChallan,
        };

        const logId = String(log._id);
        const crosscutsForLog = ctx.crosscutsByLogId.get(logId) || [];
        const flitchesForLog = ctx.flitchesByLogId.get(logId) || [];
        const peelingForLog = ctx.peelingByLogId.get(logId) || [];

        if (crosscutsForLog.length > 0) {
          const linkedFlitchIds = new Set();
          for (const cc of crosscutsForLog) {
            const ccFp = crosscutIssueForFlitchPeeling(cc);
            const ccSales = ctx.salesCmtByCcCode.get(cc.log_no_code) || '';
            const ccChallan = ctx.challanCmtByCcCode.get(cc.log_no_code) || '';
            // If crosscut was issued for order, show 'order' status + cmt
            const ccIssueFor = ccFp.issue_for || (ccSales ? (cc.crosscut_cmt ?? 0) : (ccChallan ? (cc.crosscut_cmt ?? 0) : ''));
            const ccStatus = ccFp.status || (ccSales ? 'order' : (ccChallan ? 'challan' : ''));
            const ccBase = { 
              cc_log_no: cc.log_no_code, 
              cc_rec: cc.crosscut_cmt ?? 0, 
              cc_issue_for: ccIssueFor, 
              cc_status: ccStatus,
              sales_cmt_sqm: ccSales || logBase.sales_cmt_sqm,
              challan_cmt_sqm: ccChallan || logBase.challan_cmt_sqm,
            };
            const ccId = String(cc._id);
            const flitchesForCc = ctx.flitchesByCrosscutId.get(ccId) || [];
            const peelingForCc = ctx.peelingByCcId.get(ccId) || [];

            let hasDownstream = false;
            if (flitchesForCc.length > 0) {
              hasDownstream = true;
              for (const flitch of flitchesForCc) {
                linkedFlitchIds.add(String(flitch._id));
                allRows.push(...buildFlitchRows(logBase, ccBase, flitch, ctx));
              }
            } 
            if (peelingForCc.length > 0) {
              hasDownstream = true;
              for (const peel of peelingForCc) {
                allRows.push(...buildPeelingRow(logBase, ccBase, emptyFlitch(), peel, ctx));
              }
            } 
            
            if (!hasDownstream) {
              allRows.push({ ...logBase, ...ccBase, ...emptyFlitch(), ...emptySlicing(), ...emptyPeeling(), ...emptyDressing(), ...emptySmoking(), ...emptyDownstream() });
            }
          }
          // Direct flitches not linked to any crosscut
          const directFlitches = flitchesForLog.filter(f => !linkedFlitchIds.has(String(f._id)));
          for (const flitch of directFlitches) {
            allRows.push(...buildFlitchRows(logBase, { cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '', sales_cmt_sqm: logBase.sales_cmt_sqm, challan_cmt_sqm: logBase.challan_cmt_sqm }, flitch, ctx));
          }
        } else if (flitchesForLog.length > 0) {
          for (const flitch of flitchesForLog) {
            allRows.push(...buildFlitchRows(logBase, { cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '', sales_cmt_sqm: logBase.sales_cmt_sqm, challan_cmt_sqm: logBase.challan_cmt_sqm }, flitch, ctx));
          }
        } else if (peelingForLog.length > 0) {
          for (const peel of peelingForLog) {
            allRows.push(...buildPeelingRow(logBase, { cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '' }, null, peel, ctx));
          }
        } else {
          allRows.push({ ...logBase, cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '', ...emptyFlitch(), ...emptySlicing(), ...emptyPeeling(), ...emptyDressing(), ...emptySmoking(), ...emptyDownstream() });
        }
      }

      if (!allRows.length) return res.status(404).json(new ApiResponse(404, 'No log data found for the selected period'));

      const excelLink = await createLogItemFurtherProcessReportExcel(allRows, startDate, endDate, filter);
      return res.json(new ApiResponse(200, 'Log item further process report generated successfully', excelLink));
    } catch (error) {
      console.error('Error generating report:', error);
      return next(new ApiError(error.message || 'Failed to generate report', 500));
    }
  }
);
