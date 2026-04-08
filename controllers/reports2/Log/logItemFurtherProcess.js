import mongoose from 'mongoose';
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
import finished_ready_for_packing_model from '../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import { createLogItemFurtherProcessReportExcel } from '../../../config/downloadExcel/reports2/Log/logItemFurtherProcess.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { decorative_order_item_details_model } from '../../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';

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

const round3 = (v) => (v ? Math.round(v * 1000) / 1000 : 0);
const nonNegativeDiff = (a, b) => Math.max(0, round3((parseFloat(a) || 0) - (parseFloat(b) || 0)));

const resolveRowSales = (code, id, ctx) => {
  const normCode = (code || '').trim().toUpperCase();

  let terminalSales = 0;
  let hasTerminal = false;
  const visitedTerminalIds = new Set();

  // 1. Gather all terminal stage sales linked to this code/id via groups
  const relatedGroups = ctx.groupingByCode.get(normCode) || [];
  for (const g of relatedGroups) {
    const gn = String(g.group_no || '').trim().toUpperCase();
    const terminalItems = ctx.terminalByGroupNo.get(gn) || [];
    
    for (const item of terminalItems) {
      // Use pressing_details_id as the uniqueness key to avoid counting the same piece twice (e.g. CNC + Packing)
      const pId = String(item.pressing_details_id || item.issued_from_id || item._id);
      if (visitedTerminalIds.has(pId)) continue;

      const key = String(item._id);
      const parentKey = String(item.issued_from_id);
      const itemCmt = ctx.salesCmtByCode.get(key) || ctx.salesCmtByCode.get(parentKey) || 0;
      if (itemCmt > 0) {
        terminalSales += itemCmt;
        hasTerminal = true;
        visitedTerminalIds.add(pId);
      }
    }

    // Also check direct Group-level sales if this group hasn't reached a terminal stage
    if (!hasTerminal) {
       const gid = String(g._id);
       const gCmt = ctx.salesCmtByCode.get(gn) || ctx.salesCmtByCode.get(gid) || 0;
       if (gCmt > 0) {
         terminalSales += gCmt;
         hasTerminal = true;
       }
    }
  }

  if (hasTerminal) return round3(terminalSales);

  // 2. Fallback to direct ID/Code match (Log/CC/Flitch level)
  const idKeys = [String(id)];
  let idBasedCmt = 0;
  for (const key of idKeys) {
    idBasedCmt += ctx.salesCmtByCode.get(key) || 0;
  }

  const directOrderCmt = ctx.salesCmtByCode.get(normCode) || idBasedCmt || 0;
  const directOrderRef = ctx.orderRefsByCode.get(normCode) || ctx.orderRefsByCode.get(String(id));

  const finalOrderItem = directOrderRef?.order_item_id
    ? ctx.orderItemById.get(String(directOrderRef.order_item_id))
    : null;

  return directOrderCmt > 0
    ? round3(directOrderCmt)
    : (finalOrderItem ? formatOrderItemVolumeOnly(finalOrderItem) : '');
};

const resolveGroupingSales = (groupItem, ctx) => {
  const gn = String(groupItem.group_no || '').trim().toUpperCase();
  const idKey = String(groupItem._id);
  const visitedTerminalIds = new Set();

  // 1. Check terminal-stage items for this group (Source of truth)
  let terminalSales = 0;
  let hasTerminal = false;
  const terminalItems = ctx.terminalByGroupNo.get(gn) || [];
  for (const item of terminalItems) {
    const pId = String(item.pressing_details_id || item.issued_from_id || item._id);
    if (visitedTerminalIds.has(pId)) continue;

    const key = String(item._id);
    const parentKey = String(item.issued_from_id);
    const itemCmt = ctx.salesCmtByCode.get(key) || ctx.salesCmtByCode.get(parentKey) || 0;
    if (itemCmt > 0) {
      terminalSales += itemCmt;
      hasTerminal = true;
      visitedTerminalIds.add(pId);
    }
  }

  if (hasTerminal) return round3(terminalSales);

  // 2. Direct match on Group No or Group Item ID (if no terminal reached)
  const directOrderCmt = ctx.salesCmtByCode.get(gn) || ctx.salesCmtByCode.get(idKey) || 0;
  const directOrderRef = ctx.orderRefsByCode.get(gn) || ctx.orderRefsByCode.get(idKey);

  const finalOrderItem = directOrderRef?.order_item_id ? ctx.orderItemById.get(String(directOrderRef.order_item_id)) : null;

  return directOrderCmt > 0
    ? round3(directOrderCmt)
    : (finalOrderItem ? formatOrderItemVolumeOnly(finalOrderItem) : '');
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

async function loadOrderItemDetailsByIds(orderItemIds) {
  const idStrs = [
    ...new Set(orderItemIds.filter(Boolean).map((id) => String(id))),
  ].filter((s) => mongoose.isValidObjectId(s));
  if (!idStrs.length) return new Map();
  const oidList = idStrs.map((s) => new mongoose.Types.ObjectId(s));
  const [rawItems, decItems, serItems] = await Promise.all([
    RawOrderItemDetailsModel.find({ _id: { $in: oidList } })
      .select({ cbm: 1, sqm: 1, unit_name: 1, raw_material: 1 })
      .lean(),
    decorative_order_item_details_model.find({ _id: { $in: oidList } })
      .select({ cbm: 1, sqm: 1, unit_name: 1 })
      .lean(),
    series_product_order_item_details_model.find({ _id: { $in: oidList } })
      .select({ cbm: 1, sqm: 1, unit_name: 1 })
      .lean(),
  ]);
  const map = new Map();
  for (const d of rawItems) map.set(String(d._id), d);
  for (const d of decItems) if (!map.has(String(d._id))) map.set(String(d._id), d);
  for (const d of serItems) if (!map.has(String(d._id))) map.set(String(d._id), d);
  return map;
}

const formatOrderItemVolumeOnly = (item) => {
  if (!item) return '';
  const cbm = parseFloat(item.cbm) || 0;
  const sqm = parseFloat(item.sqm) || 0;
  const unit = String(item.unit_name || '').toUpperCase();
  const rawMat = String(item.raw_material || '').toUpperCase();

  if (unit.includes('SQM') || unit.includes('SQ.M') || unit.includes('SQUARE')) return sqm > 0 ? round3(sqm) : '';
  if (unit.includes('CBM') || unit.includes('CUBIC')) return cbm > 0 ? round3(cbm) : '';
  if (rawMat === 'LOG' || rawMat === 'FLITCH') return cbm > 0 ? round3(cbm) : (sqm > 0 ? round3(sqm) : '');
  
  return cbm > 0 ? round3(cbm) : (sqm > 0 ? round3(sqm) : '');
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
  const recSqm = round3(groupItem.sqm || 0);
  const availSheets = getVal(groupItem, 'available_details.no_of_sheets') ?? recSheets;
  const availSqm = getVal(groupItem, 'available_details.sqm') ?? recSqm;
  const issueSheets = Math.max(0, recSheets - availSheets);
  const issueSqm = round3(Math.max(0, recSqm - availSqm));

  const tappingItems = ctx.tappingByGroupNo.get(groupNo) || [];
  const machineItems = tappingItems.filter((t) => {
    const st = String(getVal(t, 'tapping_details.splicing_type') || t.splicing_type || '').toUpperCase();
    return st.includes('MACHINE');
  });
  const handItems = tappingItems.filter((t) => {
    const st = String(getVal(t, 'tapping_details.splicing_type') || t.splicing_type || '').toUpperCase();
    return st.includes('HAND');
  });
  
  const machineSqm = round3(sumField(machineItems, 'sqm'));
  const handSqm = round3(sumField(handItems, 'sqm'));
  const splicingSheets = sumField(tappingItems, 'no_of_sheets');
  const splicingAvailSheets = sumField(tappingItems, 'available_details.no_of_sheets');
  const splicingAvailSqm = round3(sumField(tappingItems, 'available_details.sqm'));
  
  const splicingIssueSheets = Math.max(0, splicingSheets - splicingAvailSheets);
  const splicingIssueStatus = resolveSplicingIssueStatusFromHistory(tappingItems, ctx.tappingIssueStatusByItemId);

  const pressingItems = ctx.pressingByGroupNo.get(groupNo) || [];
  const pressingSheets = sumField(pressingItems, 'no_of_sheets');
  const pressingSqm = round3(sumField(pressingItems, 'sqm'));
  const pressingAvailSheets = sumField(pressingItems, 'available_details.no_of_sheets');
  const pressingAvailSqm = round3(sumField(pressingItems, 'available_details.sqm'));
  const pressingIssueSheets = pressingItems.reduce((acc, p) => acc + (ctx.pressingIssuedSheetsByItemId.get(String(p._id)) ?? 0), 0);
  const pressingIssueSqm = round3(pressingItems.reduce((acc, p) => acc + (ctx.pressingIssuedSqmByItemId.get(String(p._id)) ?? 0), 0));
  const pressingIssueStatus = resolvePressingIssueStatusFromHistory(pressingItems, ctx.pressingIssueStatusByItemId);

  const pressingIds = pressingItems.map((p) => String(p._id));
  const cncItems = pressingIds.flatMap((id) => ctx.cncByPressingId.get(id) || []);
  const colourItems = pressingIds.flatMap((id) => ctx.colourByPressingId.get(id) || []);

  const salesVal = resolveGroupingSales(groupItem, ctx);

  return {
    grouping_new_group_no: groupNo,
    grouping_rec_sheets: recSheets,
    grouping_rec_sqm: recSqm,
    grouping_issue_sheets: issueSheets,
    grouping_issue_sqm: issueSqm,
    grouping_issue_status: resolveGroupingIssueStatusFromHistory(groupItem, ctx.groupingIssuedForByItemId),
    grouping_balance_sheets: availSheets,
    grouping_balance_sqm: round3(availSqm),
    splicing_rec_machine_sqm: round3(machineSqm),
    splicing_rec_hand_sqm: round3(handSqm),
    splicing_sheets: splicingSheets,
    splicing_rec_leaf: sumField(tappingItems, 'no_of_sheets'),
    splicing_balance_sheets: splicingAvailSheets,
    splicing_balance_sqm: round3(splicingAvailSqm),
    splicing_issue_sheets: splicingIssueSheets,
    splicing_issue_status: splicingIssueStatus,
    pressing_sheets: pressingSheets,
    pressing_sqm: round3(pressingSqm),
    pressing_issue_sheets: pressingIssueSheets,
    pressing_issue_sqm: round3(pressingIssueSqm),
    pressing_issue_status: pressingIssueStatus,
    pressing_balance_sheets: pressingAvailSheets,
    pressing_balance_sqm: round3(pressingAvailSqm),
    cnc_type: cncItems[0]?.product_type || '',
    cnc_rec_sheets: sumField(cncItems, 'no_of_sheets'),
    colour_rec_sheets: sumField(colourItems, 'no_of_sheets'),
    sales_cmt_sqm: salesVal,
  };
}

function getDressingData(logNoCode, dressingByCode) {
  const items = dressingByCode.get(logNoCode) || [];
  if (!items.length) return emptyDressing();
  return {
    dress_rec_sqm: round3(sumField(items, 'sqm')),
    dress_issue_sqm: round3(sumField(items.filter((d) => d.issue_status), 'sqm')),
    dress_issue_status: items.find((d) => d.issue_status)?.issue_status || '',
  };
}

function getSmokingData(logNoCode, smokingByCode) {
  const items = smokingByCode.get(logNoCode) || [];
  if (!items.length) return emptySmoking();
  return {
    smoking_process: items.map((s) => s.process_name).filter(Boolean)[0] || '',
    smoking_issue_sqm: round3(sumField(items, 'sqm')),
    smoking_issue_status: items.find((s) => s.issue_status)?.issue_status || '',
  };
}

function buildSlicingSideRows(logBase, ccBase, flitchBase, side, ctx) {
  const flitchId = String(side.flitching_done_id);
  const sideCode = side.log_no_code;
  const slicingBase = {
    slicing_side: sideCode,
    slicing_process_cmt: round3(side.slicing_cmt ?? 0),
    slicing_balance_cmt: round3(side.slicing_balance_cmt ?? 0),
    slicing_rec_leaf: side.no_of_leaves ?? 0,
    slicing_balance_leaf: getVal(side, 'available_details.no_of_leaves') ?? 0,
    slicing_balance_sqm: round3(getVal(side, 'available_details.sqm') ?? 0),
    sales_cmt_sqm: resolveRowSales(sideCode, side._id, ctx),
  };

  const dressingData = getDressingData(sideCode, ctx.dressingByCode);
  const smokingData = getSmokingData(sideCode, ctx.smokingByCode);
  const groupingItems = ctx.groupingByCode.get(sideCode) || [];

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
  return [row];
}

function buildPeelingRow(logBase, ccBase, flitchBase, peel, ctx) {
  const peelingCode = peel.log_no_code;
  const peelingData = {
    ...emptySlicing(),
    peeling_process: round3(peel.peeling_cmt ?? 0),
    peeling_balance_rostroller: round3(peel.peeling_balance_rostroller ?? 0),
    peeling_output: peel.output_type || '',
    peeling_rec_leaf: peel.no_of_leaves ?? 0,
    sales_cmt_sqm: resolveRowSales(peelingCode, peel._id, ctx),
  };

  const resolvedFlitch = flitchBase || emptyFlitch();
  const dressingData = getDressingData(peelingCode, ctx.dressingByCode);
  const smokingData = getSmokingData(peelingCode, ctx.smokingByCode);
  const groupingItems = ctx.groupingByCode.get(peelingCode) || [];

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
  return [row];
}

function buildFlitchRows(logBase, ccBase, flitch, ctx) {
  const flitchCode = flitch.log_no_code ?? flitch.flitch_code ?? '';
  const flitchSalesVal = resolveRowSales(flitchCode, flitch._id, ctx);
  const flitchChallanFromMap = ctx.challanCmtByFlitchCode.get(flitch.log_no_code) || '';
  const flitchChallan = flitchChallanFromMap || (String(flitch.issue_status).toLowerCase().includes('challan') ? (flitch.flitch_cmt ?? 0) : '');

  const flitchIssue = flitchIssueForSlicingPeeling(flitch);
  // Fallback: if not issued for slicing/peeling, check if issued for order or challan
  const flitchIssueFor = flitchIssue.issue_for || (flitchSalesVal ? (flitch.flitch_cmt ?? 0) : (flitchChallan ? (flitch.flitch_cmt ?? 0) : ''));
  const flitchStatusVal = flitchIssue.status || (flitchSalesVal ? 'order' : (flitchChallan ? 'challan' : ''));
  const flitchBase = {
    flitch_no: flitchCode,
    flitch_rec: round3(flitch.flitch_cmt ?? 0),
    flitch_issue_for: round3(flitchIssueFor),
    flitch_status: flitchStatusVal,
    sales_cmt_sqm: flitchSalesVal,
    challan_cmt_sqm: round3(flitchChallan),
  };

  // ID-BASED MAPPING for Slicing from Flitch
  const slicingSides = ctx.slicingByFlitchId.get(String(flitch._id)) || [];

  const rows = [];
  for (const side of slicingSides) {
    const sideRows = buildSlicingSideRows(logBase, ccBase, flitchBase, side, ctx);
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
      sales_cmt_sqm: flitchSalesVal,
      challan_cmt_sqm: flitchChallan,
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
          { $project: { _id: { $ifNull: ['$items._id', '$_id'] }, log_no: { $ifNull: ['$items.log_no', '$log_no'] }, log_no_code: { $ifNull: ['$items.log_no_code', '$log_no_code'] }, thickness: { $ifNull: ['$items.thickness', 0] }, no_of_leaves: { $ifNull: ['$items.no_of_leaves', 0] }, available_details: '$items.available_details', grade_name: { $ifNull: ['$items.grade_name', ''] }, remark: { $ifNull: ['$items.remark', ''] }, slicing_cmt: { $ifNull: ['$od.total_cmt', 0] }, slicing_balance_cmt: '$bal.cmt', issue_type: '$type', issue_cmt: '$cmt', flitching_done_id: 1, log_inventory_item_id: 1 } }
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
          { $project: { _id: { $ifNull: ['$items._id', '$_id'] }, log_no: { $ifNull: ['$items.log_no', '$log_no'] }, log_no_code: { $ifNull: ['$items.log_no_code', '$log_no_code'] }, thickness: { $ifNull: ['$items.thickness', 0] }, no_of_leaves: { $ifNull: ['$items.no_of_leaves', 0] }, grade_name: { $ifNull: ['$items.grade_name', ''] }, remark: { $ifNull: ['$items.remark', ''] }, output_type: { $ifNull: ['$items.output_type', ''] }, peeling_cmt: { $ifNull: ['$od.total_cmt', 0] }, peeling_balance_rostroller: '$bal.cmt', issue_type: '$type', issue_cmt: { $ifNull: ['$cmt', 0] }, crosscut_done_id: 1, log_inventory_item_id: 1 } }
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
      // ── Build Order / ID maps for all stages ────────────────────────────
      const tappingHistoryAgg = tappingItemIds.length ? await tapping_done_history_model.aggregate([
        { $match: { tapping_done_item_id: { $in: tappingItemIds } } },
        { $sort: { updatedAt: -1 } },
        { $group: { _id: '$tapping_done_item_id', issue_status: { $first: '$issue_status' }, issued_for: { $first: '$issued_for' }, order_id: { $first: '$order_id' }, order_item_id: { $first: '$order_item_id' } } }
      ]) : [];
      const tappingIssueStatusByItemId = new Map(tappingHistoryAgg.map(r => [String(r._id), formatTappingPressingIssueLabel(r.issue_status, r.issued_for)]));
      const tappingOrderIdByItemId = new Map(tappingHistoryAgg.filter(r => r.order_id).map(r => [String(r._id), r.order_id]));
      const tappingOrderItemIdByItemId = new Map(tappingHistoryAgg.filter(r => r.order_item_id).map(r => [String(r._id), r.order_item_id]));

      const pressingDetailIds = pressingItems.map(p => p._id).filter(Boolean);
      const pressingHistoryAgg = pressingDetailIds.length ? await pressing_done_history_model.aggregate([
        { $match: { issued_item_id: { $in: pressingDetailIds } } },
        { $sort: { updatedAt: -1 } },
        { $group: { _id: '$issued_item_id', issued_sheets: { $sum: '$no_of_sheets' }, issued_sqm: { $sum: '$sqm' }, issue_status: { $first: '$issue_status' }, issued_for: { $first: '$issued_for' }, order_id: { $first: '$order_id' }, order_item_id: { $first: '$order_item_id' } } }
      ]) : [];
      const pressingIssuedSheetsByItemId = new Map(pressingHistoryAgg.map(r => [String(r._id), r.issued_sheets || 0]));
      const pressingIssuedSqmByItemId = new Map(pressingHistoryAgg.map(r => [String(r._id), r.issued_sqm || 0]));
      const pressingIssueStatusByItemId = new Map(pressingHistoryAgg.map(r => [String(r._id), formatPressingIssueLabel(r.issue_status, r.issued_for)]));
      const pressingOrderIdByItemId = new Map(pressingHistoryAgg.filter(r => r.order_id).map(r => [String(r._id), r.order_id]));
      const pressingOrderItemIdByItemId = new Map(pressingHistoryAgg.filter(r => r.order_item_id).map(r => [String(r._id), r.order_item_id]));

      const pressingDetailIdStrings = pressingDetailIds.map(id => String(id));

      const [cncDoneItems, colorDoneItems, packingItemsRes] = await Promise.all([
        pressingDetailIds.length ? cnc_done_details_model.find({ pressing_details_id: { $in: pressingDetailIds } }).lean() : [],
        pressingDetailIds.length ? color_done_details_model.find({ pressing_details_id: { $in: pressingDetailIds } }).lean() : [],
        (pressingDetailIds.length || groupNos.length) 
          ? finished_ready_for_packing_model.find({ 
              $or: [
                { pressing_details_id: { $in: [...pressingDetailIds, ...pressingDetailIdStrings] } },
                { group_no: { $in: groupNos } }
              ]
            }).lean() 
          : [],
      ]);

      // Merge into stage arrays
      const cncItemsRaw = [
        ...cncDoneItems,
        ...packingItemsRes.filter(p => ['CNC', 'CNC_FACTORY'].includes(p.issued_from?.toUpperCase()))
      ];
      const colourItemsRaw = [
        ...colorDoneItems,
        ...packingItemsRes.filter(p => ['COLOR', 'COLOR_FACTORY', 'COLOUR', 'COLOUR_FACTORY'].includes(p.issued_from?.toUpperCase()))
      ];

      // Build Order-ID Maps AFTER merging, so Packing items are included
      const cncOrderIdByItemId = new Map(cncItemsRaw.filter(r => r.order_id).map(r => [String(r._id), r.order_id]));
      const cncOrderItemIdByItemId = new Map(cncItemsRaw.filter(r => r.order_item_id).map(r => [String(r._id), r.order_item_id]));
      const colourOrderIdByItemId = new Map(colourItemsRaw.filter(r => r.order_id).map(r => [String(r._id), r.order_id]));
      const colourOrderItemIdByItemId = new Map(colourItemsRaw.filter(r => r.order_item_id).map(r => [String(r._id), r.order_item_id]));

      // ── Active packing orders (source of truth for order resolution) ──────
      const packingOrderRows = pressingDetailIds.length
        ? await finished_ready_for_packing_model
            .find(
              { pressing_details_id: { $in: pressingDetailIds }, order_id: { $ne: null } },
              { pressing_details_id: 1, issued_from_id: 1, issued_from: 1, order_id: 1, order_item_id: 1 }
            )
            .lean()
        : [];

      // Update Pressing Order Maps with top-priority packing data
      for (const r of packingOrderRows.filter(r => r.issued_from === 'PRESSING_FACTORY')) {
        pressingOrderIdByItemId.set(String(r.issued_from_id), r.order_id);
        pressingOrderItemIdByItemId.set(String(r.issued_from_id), r.order_item_id);
      }

      // Grouping Order ID maps
      const groupingOrderIdByItemId = new Map(packingOrderRows.filter(r => r.issued_from === 'GROUPING_FACTORY').map(r => [String(r.issued_from_id), r.order_id]));
      const groupingOrderItemIdByItemId = new Map(packingOrderRows.filter(r => r.issued_from === 'GROUPING_FACTORY').map(r => [String(r.issued_from_id), r.order_item_id]));

      // ── Fetch Sales/Order data from issued_for_order_items ──────────────
      const allStageItemIds = [
        ...tappingItemIds,
        ...pressingDetailIds,
        ...cncItemsRaw.map(i => i._id),
        ...colourItemsRaw.map(i => i._id)
      ];

      const allStageItemIdsNorm = [
        ...allStageItemIds.map(id => String(id)),
        ...allStageItemIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
      ];

      const allLogNoCodes = [...new Set([
        ...logNos,
        ...crosscuts.map(c => c.log_no_code).filter(Boolean),
        ...flitches.map(f => f.log_no).filter(Boolean),
        ...flitches.map(f => f.log_no_code).filter(Boolean),
        ...allLeafCodes,
        ...groupNos,
      ])];

      const allLogNoCodesNorm = allLogNoCodes.map(c => String(c).trim().toUpperCase());
      const groupNoRegexPatterns = groupNos.map(gn => `^${gn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
      const groupNoRegexMatch = new RegExp(groupNoRegexPatterns.join('|'), 'i');

      const orderIssuedItems = (allLogNoCodes.length || allStageItemIdsNorm.length) ? await issue_for_order_model.find(
        {
          $or: [
            { 'item_details.log_no': { $in: allLogNoCodesNorm } },
            { 'item_details.log_no_code': { $in: allLogNoCodesNorm } },
            { 'item_details.group_no': { $in: [...allLogNoCodesNorm, groupNoRegexMatch] } },
            { 'item_details.finished_no': { $in: allLogNoCodesNorm } },
            { 'item_details.issued_from_id': { $in: allStageItemIdsNorm } },
            { 'item_details.pressing_details_id': { $in: allStageItemIdsNorm } },
            { 'item_details.issued_item_id': { $in: allStageItemIdsNorm } },
            { 'item_details._id': { $in: allStageItemIdsNorm } }
          ],
        },
        { issued_from: 1, item_details: 1, order_id: 1, order_item_id: 1 }
      ).lean() : [];

      console.log('=== SALES/ORDER DEBUG ===');
      console.log('Sales records found:', orderIssuedItems.length);

      // Build maps: Unique Identifier → CMT/SQM
      const salesCmtByCode = new Map();
      const orderRefsByCode = new Map(); 

      for (const oi of orderIssuedItems) {
        const det = oi.item_details;
        if (!det) continue;

        let cmt = parseFloat(det.sqm ?? det.cmt ?? det.issued_sqm ?? det.flitch_cmt ?? det.physical_cmt ?? det.crosscut_cmt ?? 0) || 0;

        // Map by IDs
        const idKeys = [
          det.issued_from_id ? String(det.issued_from_id) : null,
          det.ref_item_id ? String(det.ref_item_id) : null,
          det._id ? String(det._id) : null,
          det.issued_item_id ? String(det.issued_item_id) : null,
          det.pressing_details_id ? String(det.pressing_details_id) : null
        ].filter(Boolean);

        // Map by Codes
        const codeKeys = [
          (det.log_no_code || '').trim().toUpperCase(),
          (det.log_no || '').trim().toUpperCase(),
          (det.group_no || '').trim().toUpperCase(),
          (det.finished_no || '').trim().toUpperCase(),
        ].filter(Boolean);

        const allKeys = [...new Set([...idKeys, ...codeKeys])];

        for (const key of allKeys) {
          salesCmtByCode.set(key, (salesCmtByCode.get(key) || 0) + cmt);
          orderRefsByCode.set(key, { order_id: oi.order_id, order_item_id: oi.order_item_id });
        }
      }

      // ── ✅ NEW: Enrich Sales with Packing data (Terminal Stage for Pressing/CNC/Color) ──
      for (const pi of packingItemsRes) {
        if (!pi.order_id) continue;
        const cmt = parseFloat(pi.sqm ?? pi.cmt ?? pi.issued_sqm ?? 0) || 0;
        if (cmt <= 0) continue;

        const idKeys = [
          String(pi._id),
          pi.issued_from_id ? String(pi.issued_from_id) : null,
          pi.pressing_details_id ? String(pi.pressing_details_id) : null
        ].filter(Boolean);

        const codeKeys = [
          (pi.group_no || '').trim().toUpperCase(),
          (pi.finished_no || '').trim().toUpperCase()
        ].filter(Boolean);

        const allKeys = [...new Set([...idKeys, ...codeKeys])];

        for (const key of allKeys) {
          // If we already have a direct order record for this ID/Code, packing is usually the same.
          // We prioritize direct order cmts if they exist, or add if distinct.
          if (!salesCmtByCode.has(key)) {
            salesCmtByCode.set(key, cmt);
            orderRefsByCode.set(key, { order_id: pi.order_id, order_item_id: pi.order_item_id });
          }
        }
      }

      // Bulk-fetch Orders
      const allOrderIds = [...new Set([...orderRefsByCode.values()].map(d => String(d.order_id)))];
      const orderDocs = allOrderIds.length ? await OrderModel.find({ _id: { $in: allOrderIds } }).lean() : [];
      const orderById = new Map(orderDocs.map(o => [String(o._id), o]));

      const allOrderItemIds = [...new Set([...orderRefsByCode.values()].map(d => String(d.order_item_id)))];
      const orderItemById = await loadOrderItemDetailsByIds(allOrderItemIds);

      const terminalByGroupNo = new Map();
      [...cncItemsRaw, ...colourItemsRaw, ...packingItemsRes].forEach(item => {
        const gn = String(item.group_no || '').trim().toUpperCase();
        if (!gn) return;
        const list = terminalByGroupNo.get(gn) || [];
        list.push(item);
        terminalByGroupNo.set(gn, list);
      });

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

      const challanCmtByLogNo = new Map();
      const challanCmtByCcCode = new Map();
      const challanCmtByFlitchCode = new Map();
      for (const ci of challanIssuedItems) {
        const det = ci.issued_item_details;
        if (!det) continue;
        const cmt = parseFloat(det.flitch_cmt ?? det.crosscut_cmt ?? det.physical_cmt ?? det.cmt ?? 0) || 0;
        if (ci.issued_from === 'LOG') {
          const key = det.log_no;
          if (key) challanCmtByLogNo.set(key, (challanCmtByLogNo.get(key) || 0) + cmt);
        } else if (ci.issued_from === 'CROSSCUTTING') {
          const key = det.log_no_code;
          if (key) challanCmtByCcCode.set(key, (challanCmtByCcCode.get(key) || 0) + cmt);
        } else if (ci.issued_from === 'FLITCHING_FACTORY') {
          const key = det.log_no_code;
          if (key) challanCmtByFlitchCode.set(key, (challanCmtByFlitchCode.get(key) || 0) + cmt);
        }
      }

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
        cncByPressingId: groupByKey(cncItemsRaw, (c) => String(c.pressing_details_id)),
        colourByPressingId: groupByKey(colourItemsRaw, (c) => String(c.pressing_details_id)),
        groupingIssuedForByItemId,
        groupingOrderIdByItemId,
        groupingOrderItemIdByItemId,
        tappingIssueStatusByItemId,
        tappingOrderIdByItemId,
        tappingOrderItemIdByItemId,
        pressingIssuedSheetsByItemId,
        pressingIssuedSqmByItemId,
        pressingIssueStatusByItemId,
        pressingOrderIdByItemId,
        pressingOrderItemIdByItemId,
        cncOrderIdByItemId,
        cncOrderItemIdByItemId,
        colourOrderIdByItemId,
        colourOrderItemIdByItemId,
        orderById,
        orderItemById,
        salesCmtByCode,
        orderRefsByCode,
        terminalByGroupNo,
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
        const logSalesVolume = resolveRowSales(log.log_no, log._id, ctx);
        const logChallanFromMap = ctx.challanCmtByLogNo.get(log.log_no) || '';
        const logChallan = logChallanFromMap || (String(log.issue_status).toLowerCase().includes('challan') ? (log.physical_cmt ?? 0) : '');
        
        const logBase = {
          item_name: log.item_name || '',
          log_no: log.log_no,
          indian_cmt: log.indian_cmt ?? 0,
          rece_cmt: log.physical_cmt ?? 0,
          inward_issue_for: getIssuedForCmt(log.issue_status, log.physical_cmt) ?? 0,
          inward_issue_status: log.issue_status || '',
          sales_cmt_sqm: logSalesVolume,
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
            const ccSalesVolume = resolveRowSales(cc.log_no_code, cc._id, ctx);
            const ccChallan = ctx.challanCmtByCcCode.get(cc.log_no_code) || '';
            
            const ccIssueFor = ccFp.issue_for || (ccSalesVolume ? (cc.crosscut_cmt ?? 0) : (ccChallan ? (cc.crosscut_cmt ?? 0) : ''));
            const ccStatus = ccFp.status || (ccSalesVolume ? 'order' : (ccChallan ? 'challan' : ''));
            
            const ccBase = { 
              cc_log_no: cc.log_no_code, 
              cc_rec: cc.crosscut_cmt ?? 0, 
              cc_issue_for: ccIssueFor, 
              cc_status: ccStatus,
              sales_cmt_sqm: ccSalesVolume,
              challan_cmt_sqm: ccChallan,
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
              allRows.push({ 
                ...logBase, 
                ...ccBase, 
                ...emptyFlitch(), 
                ...emptySlicing(), 
                ...emptyPeeling(), 
                ...emptyDressing(), 
                ...emptySmoking(), 
                ...emptyDownstream(),
                 sales_cmt_sqm: ccSalesVolume,
                 challan_cmt_sqm: ccChallan,
              });
            }
          }
          // Direct flitches not linked to any crosscut
          const directFlitches = flitchesForLog.filter(f => !linkedFlitchIds.has(String(f._id)));
          for (const flitch of directFlitches) {
            allRows.push(...buildFlitchRows(logBase, { cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '' }, flitch, ctx));
          }
        } else if (flitchesForLog.length > 0) {
          for (const flitch of flitchesForLog) {
            allRows.push(...buildFlitchRows(logBase, { cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '' }, flitch, ctx));
          }
        } else if (peelingForLog.length > 0) {
          for (const peel of peelingForLog) {
            allRows.push(...buildPeelingRow(logBase, { cc_log_no: '', cc_rec: 0, cc_issue_for: 0, cc_status: '' }, null, peel, ctx));
          }
        } else {
          allRows.push({ 
            ...logBase, 
            cc_log_no: '', 
            cc_rec: 0, 
            cc_issue_for: 0, 
            cc_status: '', 
            ...emptyFlitch(), 
            ...emptySlicing(), 
            ...emptyPeeling(), 
            ...emptyDressing(), 
            ...emptySmoking(), 
            ...emptyDownstream(), 
            sales_cmt_sqm: logSalesVolume, 
            challan_cmt_sqm: logChallan 
          });
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
