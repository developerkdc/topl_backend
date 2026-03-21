import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { flitch_inventory_items_view_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { issued_for_slicing_model } from '../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import { slicing_done_items_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import { process_done_items_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import grouping_done_history_model from '../../../database/schema/factory/grouping/grouping_done_history.schema.js';
import { tapping_done_history_model } from '../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import { tapping_done_items_details_model } from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { color_done_details_model } from '../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import finished_ready_for_packing_model from '../../../database/schema/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.schema.js';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { RawOrderItemDetailsModel } from '../../../database/schema/order/raw_order/raw_order_item_details.schema.js';
import { decorative_order_item_details_model } from '../../../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../../../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import { createFlitchItemFurtherProcessReportExcel } from '../../../config/downloadExcel/reports2/Flitch/flitchItemFurtherProcess.js';
import { item_issued_from } from '../../../database/Utils/constants/constants.js';

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

/** Sales column: order line quantity as CBM or SQM (same semantics as log further process report). */
function formatOrderItemCbmOrSqm(item) {
  if (!item) return '';
  const cbm = parseFloat(item.cbm) || 0;
  const sqm = parseFloat(item.sqm) || 0;
  const unit = String(item.unit_name || '').toUpperCase();
  const rawMat = String(item.raw_material || '').toUpperCase();
  if (unit.includes('SQM') || unit.includes('SQ.M') || unit.includes('SQUARE')) {
    if (sqm > 0) return `${round3(sqm)} SQM`;
  }
  if (unit.includes('CBM') || unit.includes('CUBIC')) {
    if (cbm > 0) return `${round3(cbm)} CBM`;
  }
  if (rawMat === 'LOG' || rawMat === 'FLITCH') {
    if (cbm > 0) return `${round3(cbm)} CBM`;
    if (sqm > 0) return `${round3(sqm)} SQM`;
  }
  if (cbm > 0) return `${round3(cbm)} CBM`;
  if (sqm > 0) return `${round3(sqm)} SQM`;
  return '';
}

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

/** Stock / movement differences (received − available, issued − processed, etc.) never go below zero. */
function nonNegativeDiff(minuend, subtrahend) {
  const a = parseFloat(minuend) || 0;
  const b = parseFloat(subtrahend) || 0;
  return Math.max(0, a - b);
}

/**
 * Merge slicing_done rows by (flitch_inventory_item_id, log_no_code): sums process CMT across
 * initial slicing + re-slicing (multiple slicing_done_other_details for same side).
 */
function mergeSlicingItemsBySideCode(slicingItems) {
  const map = new Map();
  for (const s of slicingItems) {
    const fiid = String(s.issued_for_slicing?.flitch_inventory_item_id || '');
    const key = `${fiid}||${s.log_no_code}`;
    const piece = parseFloat(s.item_cmt) || 0;
    if (!map.has(key)) {
      map.set(key, { ...s, cmt: piece, item_cmt: piece });
    } else {
      const agg = map.get(key);
      const next = piece + (parseFloat(agg.cmt) || 0);
      agg.cmt = next;
      agg.item_cmt = next;
      if (s.no_of_leaves != null) agg.no_of_leaves = s.no_of_leaves;
    }
  }
  return [...map.values()];
}

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

// Empty placeholders for each stage not reached
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
  jwc_veneer: '',
  awc_pressing_sheets: '',
});

const emptySlicing = () => ({
  slicing_side: '',
  slicing_process_cmt: '',
  slicing_balance_cmt: '',
  slicing_rec_leaf: '',
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
  pressingIssueStatusByItemId,
  orderMaps,
  fallbackDirectFlitchOrderItemId = null
) {
  const groupNo = groupItem.group_no;
  const recSheets = groupItem.no_of_sheets || 0;
  const recSqm = groupItem.sqm || 0;
  const availSheets =
    getVal(groupItem, 'available_details.no_of_sheets') ?? recSheets;
  const availSqm = getVal(groupItem, 'available_details.sqm') ?? recSqm;
  const issueSheets = nonNegativeDiff(recSheets, availSheets);
  const issueSqm = nonNegativeDiff(recSqm, availSqm);

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
  const splicingAvailSheets = sumField(tappingItems, 'available_details.no_of_sheets');
  const splicingAvailSqm = sumField(tappingItems, 'available_details.sqm');
  const splicingIssueSheets = nonNegativeDiff(splicingSheets, splicingAvailSheets);
  const splicingIssueStatus = resolveSplicingIssueStatusFromHistory(
    tappingItems,
    tappingIssueStatusByItemId
  );

  // Pressing
  const pressingItems = pressingByGroupNo.get(groupNo) || [];
  const pressingSheets = sumField(pressingItems, 'no_of_sheets');
  const pressingSqm = sumField(pressingItems, 'sqm');
  const pressingAvailSheets = sumField(pressingItems, 'available_details.no_of_sheets');
  const pressingAvailSqm = sumField(pressingItems, 'available_details.sqm');
  const pressingIssueSheets = nonNegativeDiff(pressingSheets, pressingAvailSheets);
  const pressingIssueSqm = nonNegativeDiff(pressingSqm, pressingAvailSqm);
  const pressingIssueStatus = resolvePressingIssueStatusFromHistory(
    pressingItems,
    pressingIssueStatusByItemId
  );

  // CNC & Colour via pressing._id
  const pressingIds = pressingItems.map((p) => String(p._id));
  const cncItems = pressingIds.flatMap((id) => cncByPressingId.get(id) || []);
  const colourItems = pressingIds.flatMap((id) => colourByPressingId.get(id) || []);
  const cncType = cncItems[0]?.product_type || '';
  const cncRecSheets = sumField(cncItems, 'no_of_sheets');
  const colourRecSheets = sumField(colourItems, 'no_of_sheets');

  const groupingIssueStatus =
    groupingIssuedForByItemId?.get(String(groupItem._id)) || '';

  // ── Order / Sales resolution ────────────────────────────────────────────
  // Priority (most-downstream first): Colour → CNC → Pressing → Tapping → Grouping
  const {
    groupingOrderItemIdByItemId,
    tappingOrderItemIdByItemId,
    pressingOrderItemIdByItemId,
    cncOrderItemIdByItemId,
    colourOrderItemIdByItemId,
    orderItemById,
  } = orderMaps || {};

  let resolvedOrderItemId = null;
  for (const c of colourItems) {
    const iid = colourOrderItemIdByItemId?.get(String(c._id));
    if (iid) {
      resolvedOrderItemId = iid;
      break;
    }
  }
  if (!resolvedOrderItemId) {
    for (const c of cncItems) {
      const iid = cncOrderItemIdByItemId?.get(String(c._id));
      if (iid) {
        resolvedOrderItemId = iid;
        break;
      }
    }
  }
  if (!resolvedOrderItemId) {
    for (const p of pressingItems) {
      const iid = pressingOrderItemIdByItemId?.get(String(p._id));
      if (iid) {
        resolvedOrderItemId = iid;
        break;
      }
    }
  }
  if (!resolvedOrderItemId) {
    for (const t of tappingItems) {
      const iid = tappingOrderItemIdByItemId?.get(String(t._id));
      if (iid) {
        resolvedOrderItemId = iid;
        break;
      }
    }
  }
  if (!resolvedOrderItemId) {
    resolvedOrderItemId =
      groupingOrderItemIdByItemId?.get(String(groupItem._id)) ?? null;
  }
  const salesOrderItem =
    resolvedOrderItemId && orderItemById
      ? orderItemById.get(String(resolvedOrderItemId))
      : null;
  const fallbackItem =
    fallbackDirectFlitchOrderItemId && orderItemById
      ? orderItemById.get(String(fallbackDirectFlitchOrderItemId))
      : null;
  const salesCbmSqm =
    formatOrderItemCbmOrSqm(salesOrderItem) ||
    formatOrderItemCbmOrSqm(fallbackItem) ||
    '';

  return {
    grouping_new_group_no: groupNo,
    grouping_rec_sheets: recSheets || '',
    grouping_rec_sqm: recSqm || '',
    grouping_issue_sheets: issueSheets || '',
    grouping_issue_sqm: issueSqm || '',
    grouping_issue_status: groupingIssueStatus,
    grouping_balance_sheets: availSheets || '',
    grouping_balance_sqm: availSqm || '',
    splicing_rec_machine_sqm: machineSqm || '',
    splicing_rec_hand_sqm: handSqm || '',
    splicing_sheets: splicingSheets || '',
    splicing_issue_sheets: splicingIssueSheets || '',
    splicing_issue_status: splicingIssueStatus,
    splicing_balance_sheets: splicingAvailSheets || '',
    splicing_balance_sqm: splicingAvailSqm || '',
    pressing_sheets: pressingSheets || '',
    pressing_sqm: pressingSqm || '',
    pressing_issue_sheets: pressingIssueSheets || '',
    pressing_issue_sqm: pressingIssueSqm || '',
    pressing_issue_status: pressingIssueStatus,
    pressing_balance_sheets: pressingAvailSheets || '',
    pressing_balance_sqm: pressingAvailSqm || '',
    cnc_type: cncType,
    cnc_rec_sheets: cncRecSheets || '',
    colour_rec_sheets: colourRecSheets || '',
    sales_order_no: salesCbmSqm,
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
    // Total SQM that passed through smoking/dying (same semantics as log further process report)
    smoking_process: totalSqm || '',
    // SQM issued onward from smoking (only rows with issue_status)
    smoking_issue_sqm: issuedSqm,
    smoking_issue_status: issuedItems[0]?.issue_status || '',
  };
}

// ─────────────────────── Slicing side rows builder ──────────────────────────

function buildSlicingSideRows(
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
  pressingIssueStatusByItemId,
  orderMaps,
  fallbackDirectFlitchOrderItemId = null
) {
  const sideCode = side.log_no_code;

  // Process Cmt = slicing done cmt; Balance Cmt = remaining cmt (issued - process)
  const processCmt = parseFloat(side.item_cmt ?? side.cmt) || 0;
  const issuedCmt = parseFloat(side.issued_for_slicing?.cmt) || 0;
  const balanceCmt = nonNegativeDiff(issuedCmt, processCmt);

  const slicingBase = {
    slicing_side: sideCode,
    slicing_process_cmt: processCmt || '',
    slicing_balance_cmt: balanceCmt || '',
    slicing_rec_leaf: side.no_of_leaves || '',
  };

  const dressingData = getDressingData(sideCode, dressingByCode);
  const smokingData = getSmokingData(sideCode, smokingByCode);
  const groupingItems = groupingByCode.get(sideCode) || [];

  if (groupingItems.length > 0) {
    return groupingItems.map((g) => ({
      ...flitchBase,
      ...slicingBase,
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
        pressingIssueStatusByItemId,
        orderMaps,
        fallbackDirectFlitchOrderItemId
      ),
    }));
  }

  const directOnlySales =
    fallbackDirectFlitchOrderItemId && orderMaps?.orderItemById
      ? formatOrderItemCbmOrSqm(
          orderMaps.orderItemById.get(String(fallbackDirectFlitchOrderItemId))
        ) || ''
      : '';

  return [
    {
      ...flitchBase,
      ...slicingBase,
      ...dressingData,
      ...smokingData,
      ...emptyDownstream(),
      ...(directOnlySales ? { sales_order_no: directOnlySales } : {}),
    },
  ];
}



// ─────────────────────── Main controller ────────────────────────────────────

/**
 * Flitch Item Further Process Report
 * Hierarchical report tracking each inventory flitch through all downstream
 * processing stages: Slicing → Dressing → Smoking → Grouping →
 * Splicing → Pressing → CNC → Colour.
 * One row per leaf entity (grouping item / peeling item / slicing side).
 * Empty cells when a stage was not reached for that lineage.
 *
 * @route POST /api/V1/reports2/flitch/download-excel-flitch-item-further-process-report
 */
export const FlitchItemFurtherProcessReportExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate, filter = {} } = req.body;

    if (!startDate || !endDate) {
      return next(new ApiError('Start date and end date are required', 400));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
    }

    if (start > end) {
      return next(new ApiError('Start date cannot be after end date', 400));
    }

    const itemFilter = {};
    if (filter.item_name) itemFilter.item_name = filter.item_name;
    if (filter.flitch_no) itemFilter.flitch_code = filter.flitch_no;
    if (filter.inward_id) {
      itemFilter['flitch_invoice_details.inward_sr_no'] = Number(filter.inward_id);
    }

    try {
      // ── Step 1: Fetch flitches in the date range ──────────────────────────
      const flitches = await flitch_inventory_items_view_model.aggregate([
        {
          $match: {
            ...itemFilter,
            'flitch_invoice_details.inward_date': { $gte: start, $lte: end },
          },
        },
        { $sort: { item_name: 1, flitch_code: 1 } },
      ]);

      if (!flitches.length) {
        return res
          .status(404)
          .json(new ApiResponse(404, 'No flitch data found for the selected period'));
      }

      // ── Step 1b: Fetch CMT issued for Slicing/Peeling per flitch ─────────
      const flitchIds = flitches.map((f) => f._id).filter(Boolean);

      const issuedForSlicingAgg = flitchIds.length
        ? await issued_for_slicing_model.aggregate([
            { $match: { flitch_inventory_item_id: { $in: flitchIds } } },
            {
              $group: {
                _id: '$flitch_inventory_item_id',
                cmt: { $sum: '$cmt' },
              },
            },
          ])
        : [];

      const issueForSlicingByFlitchId = new Map(
        issuedForSlicingAgg.map((r) => [String(r._id), r.cmt])
      );

      // slicing_done_items.log_no is the round log (same as issued_for_slicing.log_no), NOT flitch_code.
      // Link slicing rows via issue_for_slicing.flitch_inventory_item_id.
      const issueIdsForReportFlitches = flitchIds.length
        ? await issued_for_slicing_model.distinct('_id', {
            flitch_inventory_item_id: { $in: flitchIds },
          })
        : [];

      // ── Step 2: Bulk-fetch all processing stage data ──────────────────────
      const slicingItems = issueIdsForReportFlitches.length
        ? await slicing_done_items_model.aggregate([
            {
              $lookup: {
                from: 'slicing_done_other_details',
                localField: 'slicing_done_other_details_id',
                foreignField: '_id',
                as: 'slicing_done_other_details',
              },
            },
            { $unwind: { path: '$slicing_done_other_details', preserveNullAndEmptyArrays: false } },
            {
              $match: {
                'slicing_done_other_details.issue_for_slicing_id': {
                  $in: issueIdsForReportFlitches,
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
            { $unwind: { path: '$issued_for_slicing', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'issue_for_slicing_available',
                localField: 'slicing_done_other_details.issue_for_slicing_id',
                foreignField: 'issue_for_slicing_id',
                as: 'issue_for_slicing_available_details',
              },
            },
            {
              $addFields: {
                issue_for_slicing_available_details: {
                  $arrayElemAt: ['$issue_for_slicing_available_details', 0],
                },
              },
            },
            {
              $lookup: {
                from: 'slicing_done_items',
                localField: 'slicing_done_other_details_id',
                foreignField: 'slicing_done_other_details_id',
                as: '_slicing_batch_siblings',
              },
            },
            {
              $addFields: {
                item_cmt: {
                  $let: {
                    vars: {
                      raw: { $ifNull: ['$cmt', 0] },
                      total: {
                        $ifNull: ['$slicing_done_other_details.total_cmt', 0],
                      },
                      cnt: {
                        $size: { $ifNull: ['$_slicing_batch_siblings', []] },
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: ['$$raw', 0] },
                        '$$raw',
                        {
                          $cond: [
                            {
                              $and: [{ $gt: ['$$total', 0] }, { $gt: ['$$cnt', 0] }],
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
            { $project: { _slicing_batch_siblings: 0 } },
          ])
        : [];

      const slicingItemsMerged = mergeSlicingItemsBySideCode(slicingItems);

      const allLeafCodes = [
        ...new Set([...slicingItemsMerged.map((s) => s.log_no_code)]),
      ];

      const [dressingItems, smokingItems, groupingItems] = await Promise.all([
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
                  order_item_id: { $first: '$order_item_id' },
                },
              },
            ])
          : [];
      const groupingIssuedForByItemId = new Map(
        groupingIssuedForAgg.map((r) => [String(r._id), r.issued_for || ''])
      );
      const groupingOrderIdByItemId = new Map(
        groupingIssuedForAgg
          .filter((r) => r.order_id)
          .map((r) => [String(r._id), r.order_id])
      );
      const groupingOrderItemIdByItemId = new Map(
        groupingIssuedForAgg
          .filter((r) => r.order_id && r.order_item_id)
          .map((r) => [String(r._id), r.order_item_id])
      );

      const groupNos = [...new Set(groupingItems.map((g) => g.group_no))];

      const [tappingRaw, pressingItems] = await Promise.all([
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
        groupNos.length
          ? pressing_done_details_model
              .find({ group_no: { $in: groupNos } })
              .lean()
          : [],
      ]);

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
                  order_item_id: { $first: '$order_item_id' },
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
      const tappingOrderItemIdByItemId = new Map(
        tappingHistoryAgg
          .filter((r) => r.order_id && r.order_item_id)
          .map((r) => [String(r._id), r.order_item_id])
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
                  issue_status: { $first: '$issue_status' },
                  issued_for: { $first: '$issued_for' },
                  order_id: { $first: '$order_id' },
                  order_item_id: { $first: '$order_item_id' },
                },
              },
            ])
          : [];
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
      const pressingOrderItemIdByItemId = new Map(
        pressingHistoryAgg
          .filter((r) => r.order_id && r.order_item_id)
          .map((r) => [String(r._id), r.order_item_id])
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

      // ── Active packing orders (source of truth for order resolution) ──────
      // finished_ready_for_packing is reliably updated/deleted on reverts,
      // unlike history models which can retain stale order_id values.
      const packingOrderRows = pressingIds.length
        ? await finished_ready_for_packing_model
            .find(
              { pressing_details_id: { $in: pressingIds }, order_id: { $ne: null } },
              {
                pressing_details_id: 1,
                issued_from_id: 1,
                issued_from: 1,
                order_id: 1,
                order_item_id: 1,
              }
            )
            .lean()
        : [];

      const colourOrderIdByItemId = new Map(
        packingOrderRows
          .filter((r) => r.issued_from === 'COLOR' && r.order_id)
          .map((r) => [String(r.issued_from_id), r.order_id])
      );
      const colourOrderItemIdByItemId = new Map(
        packingOrderRows
          .filter((r) => r.issued_from === 'COLOR' && r.order_id && r.order_item_id)
          .map((r) => [String(r.issued_from_id), r.order_item_id])
      );
      const cncOrderIdByItemId = new Map(
        packingOrderRows
          .filter((r) => r.issued_from === 'CNC' && r.order_id)
          .map((r) => [String(r.issued_from_id), r.order_id])
      );
      const cncOrderItemIdByItemId = new Map(
        packingOrderRows
          .filter((r) => r.issued_from === 'CNC' && r.order_id && r.order_item_id)
          .map((r) => [String(r.issued_from_id), r.order_item_id])
      );
      // Packing-sourced pressing data overrides history-sourced data (more reliable)
      for (const r of packingOrderRows.filter(
        (r) => r.issued_from === 'PRESSING_FACTORY' && r.order_id
      )) {
        pressingOrderIdByItemId.set(String(r.issued_from_id), r.order_id);
      }
      for (const r of packingOrderRows.filter(
        (r) =>
          r.issued_from === 'PRESSING_FACTORY' && r.order_id && r.order_item_id
      )) {
        pressingOrderItemIdByItemId.set(String(r.issued_from_id), r.order_item_id);
      }

      // Flitch issued to customer order (`issued_for_order_items`, issued_from FLITCH)
      const flitchCodeSet = new Set();
      for (const f of flitches) {
        for (const c of [f.flitch_code, f.log_no, f.log_no_code]) {
          if (c == null || String(c).trim() === '') continue;
          flitchCodeSet.add(String(c).trim().toUpperCase());
        }
      }
      const flitchCodeList = [...flitchCodeSet];
      const flitchIssuedForOrderRows = flitchCodeList.length
        ? await issue_for_order_model
            .find(
              {
                issued_from: item_issued_from.flitch,
                $or: [
                  { 'item_details.log_no_code': { $in: flitchCodeList } },
                  { 'item_details.flitch_code': { $in: flitchCodeList } },
                ],
              },
              { order_id: 1, order_item_id: 1, item_details: 1 }
            )
            .lean()
        : [];
      const flitchDirectOrderByFlitchCode = new Map();
      const flitchDirectOrderCmtByFlitchCode = new Map(); // code → total CMT issued to order
      for (const row of flitchIssuedForOrderRows) {
        const det = row.item_details;
        if (!det) continue;
        const issuedCmt =
          parseFloat(det.flitch_cmt ?? det.cmt ?? det.physical_cmt ?? 0) || 0;
        const payload = {
          order_id: row.order_id,
          order_item_id: row.order_item_id,
        };
        for (const code of [det.log_no_code, det.flitch_code]) {
          if (code == null || String(code).trim() === '') continue;
          const key = String(code).trim().toUpperCase();
          flitchDirectOrderByFlitchCode.set(key, payload);
          flitchDirectOrderCmtByFlitchCode.set(
            key,
            (flitchDirectOrderCmtByFlitchCode.get(key) || 0) + issuedCmt
          );
        }
      }

      // ── Bulk-fetch orders for all resolved order IDs ──────────────────────
      const allOrderIds = [
        ...new Set(
          [
            ...groupingOrderIdByItemId.values(),
            ...tappingOrderIdByItemId.values(),
            ...pressingOrderIdByItemId.values(),
            ...cncOrderIdByItemId.values(),
            ...colourOrderIdByItemId.values(),
            ...[...flitchDirectOrderByFlitchCode.values()].map((d) => d.order_id),
          ]
            .filter(Boolean)
            .map(String)
        ),
      ];
      const orderDocs = allOrderIds.length
        ? await OrderModel.find(
            { _id: { $in: allOrderIds } },
            { order_no: 1, orderDate: 1, owner_name: 1 }
          ).lean()
        : [];
      const orderById = new Map(orderDocs.map((o) => [String(o._id), o]));

      const allOrderItemIds = [
        ...groupingOrderItemIdByItemId.values(),
        ...tappingOrderItemIdByItemId.values(),
        ...pressingOrderItemIdByItemId.values(),
        ...cncOrderItemIdByItemId.values(),
        ...colourOrderItemIdByItemId.values(),
        ...[...flitchDirectOrderByFlitchCode.values()].map((d) => d.order_item_id),
      ];
      const orderItemById = await loadOrderItemDetailsByIds(allOrderItemIds);

      const orderMaps = {
        groupingOrderIdByItemId,
        groupingOrderItemIdByItemId,
        tappingOrderIdByItemId,
        tappingOrderItemIdByItemId,
        pressingOrderIdByItemId,
        pressingOrderItemIdByItemId,
        cncOrderIdByItemId,
        cncOrderItemIdByItemId,
        colourOrderIdByItemId,
        colourOrderItemIdByItemId,
        orderById,
        orderItemById,
        flitchDirectOrderByFlitchCode,
      };

      // ── Step 3: Build lookup maps ─────────────────────────────────────────
      const slicingByFlitchId = groupByKey(
        slicingItemsMerged,
        (s) => String(s.issued_for_slicing?.flitch_inventory_item_id || '')
      );
      const dressingByCode = groupByKey(dressingItems, 'log_no_code');
      const smokingByCode = groupByKey(smokingItems, 'log_no_code');
      const groupingByCode = groupByKey(groupingItems, 'log_no_code');
      const tappingByGroupNo = groupByKey(tappingRaw, 'group_no');
      const pressingByGroupNo = groupByKey(pressingItems, 'group_no');
      const cncByPressingId = groupByKey(cncItems, (c) => String(c.pressing_details_id));
      const colourByPressingId = groupByKey(colourItems, (c) =>
        String(c.pressing_details_id)
      );

      // ── Step 4: Build flat hierarchical rows ──────────────────────────────
      const allRows = [];

      for (const flitch of flitches) {
        const slicingCmt = issueForSlicingByFlitchId.get(String(flitch._id)) || 0;

        let directOrderCmt = 0;
        for (const c of [flitch.flitch_code, flitch.log_no, flitch.log_no_code]) {
          if (c == null || String(c).trim() === '') continue;
          const v = flitchDirectOrderCmtByFlitchCode.get(String(c).trim().toUpperCase());
          if (v) { directOrderCmt = v; break; }
        }
        const issueForTotal = round3(slicingCmt + directOrderCmt) || '';

        const flitchBase = {
          item_name: flitch.item_name || '',
          log_no: flitch.log_no || '',
          rece_cmt: flitch.flitch_cmt ?? '',
          issue_for: issueForTotal,
          issue_status: flitch.issue_status || '',
        };

        let fallbackDirectFlitchOrderItemId = null;
        for (const c of [flitch.flitch_code, flitch.log_no, flitch.log_no_code]) {
          if (c == null || String(c).trim() === '') continue;
          const p = flitchDirectOrderByFlitchCode.get(String(c).trim().toUpperCase());
          if (p?.order_item_id) {
            fallbackDirectFlitchOrderItemId = p.order_item_id;
            break;
          }
        }

        const allSlicingForFlitch =
          slicingByFlitchId.get(String(flitch._id)) || [];
        const slicingSides = allSlicingForFlitch;

        const rows = [];

        for (const side of slicingSides) {
          rows.push(
            ...buildSlicingSideRows(
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
              pressingIssueStatusByItemId,
              orderMaps,
              fallbackDirectFlitchOrderItemId
            )
          );
        }

        if (!rows.length) {
          const directSales = formatOrderItemCbmOrSqm(
            fallbackDirectFlitchOrderItemId
              ? orderItemById.get(String(fallbackDirectFlitchOrderItemId))
              : null
          );
          rows.push({
            ...flitchBase,
            ...emptySlicing(),
            ...emptyDressing(),
            ...emptySmoking(),
            ...emptyDownstream(),
            ...(directSales ? { sales_order_no: directSales } : {}),
          });
        }

        allRows.push(...rows);
      }

      if (!allRows.length) {
        return res
          .status(404)
          .json(new ApiResponse(404, 'No flitch data found for the selected period'));
      }

      const excelLink = await createFlitchItemFurtherProcessReportExcel(
        allRows,
        startDate,
        endDate,
        filter
      );

      return res.json(
        new ApiResponse(
          200,
          'Flitch item further process report generated successfully',
          excelLink
        )
      );
    } catch (error) {
      console.error('Error generating flitch item further process report:', error);
      return next(new ApiError(error.message || 'Failed to generate report', 500));
    }
  }
);
