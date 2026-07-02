import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { issues_for_crosscutting_model } from '../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import { peeling_done_other_details_model, peeling_done_items_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { rejected_crosscutting_model } from '../../../database/schema/factory/crossCutting/rejectedCrosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import issues_for_peeling_wastage_model from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import { createItemWiseInwardReportExcel } from '../../../config/downloadExcel/reports2/Log/itemWiseInward.js';

/**
 * Item Wise Inward Daily Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of logs
 * from inward receipt through crosscutting, flitching, peeling, and sales.
 * Now includes Amount (cost) and Expense Amount tracking at every stage:
 * Round Log, Cross Cut, Flitch, Peeling, Sales, Job Work Challan, Rejected.
 *
 * @route POST /api/V1/report/download-excel-item-wise-inward-daily-report
 * @access Private
 */
export const ItemWiseInwardDailyReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {}, includeCostAndExpense } = req.body;

  console.log('Item Wise Inward Report Request - Start Date:', startDate);
  console.log('Item Wise Inward Report Request - End Date:', endDate);
  console.log('Item Wise Inward Report Request - Filter:', filter);
  console.log('Item Wise Inward Report Request - Include Cost and Expense:', includeCostAndExpense);

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
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    /*********************************************************
     STEP 1: Get all unique items
    *********************************************************/
    const allItems = await log_inventory_items_model.aggregate([
      { $match: itemFilter },
      {
        $group: {
          _id: {
            item_id: '$item_id',
            item_name: '$item_name',
          },
        },
      },
    ]);

    if (!allItems.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No stock data found for the selected period'));
    }

    /*********************************************************
     STEP 2: Helper Map
     Each field now has a *_cost and *_expense sibling where relevant.
    *********************************************************/
    const reportMap = new Map();

    const FIELD_DEFAULTS = {
      issue_for_cc: 0,
      cc_issued: 0,
      cc_received: 0,
      flitch_issued: 0,
      flitch_received: 0,
      peeling_issued: 0,
      peeling_received: 0,
      invoice_cmt: 0,
      indian_cmt: 0,
      actual_cmt: 0,
      sales: 0,
      rejected: 0,
      recover_from_rejected: 0,
      issue_for_sqedge: 0,
      job_work_challan: 0,

      // Amount fields (cost + expense) per stage
      amount: 0, // round log cost amount (received)
      amount_expense: 0, // round log expense amount (received)

      cc_received_cost: 0,
      cc_received_expense: 0,

      flitch_received_cost: 0,
      flitch_received_expense: 0,

      peeling_received_cost: 0,
      peeling_received_expense: 0,

      peeling_issued_cost: 0,
      peeling_issued_expense: 0,

      sales_cost: 0,
      sales_expense: 0,

      job_work_challan_cost: 0,
      job_work_challan_expense: 0,

      rejected_cost: 0,
      rejected_expense: 0,
    };

    const addValue = (item_id, item_name, field, value) => {
      const key = `${item_id}_${item_name}`;

      const existing = reportMap.get(key) || {
        item_id,
        item_name,
        ...FIELD_DEFAULTS,
      };

      existing[field] += value || 0;
      reportMap.set(key, existing);
    };

    /*********************************************************
     STEP 3: Current Available CMT (closing balance)
    *********************************************************/
    const [currentLogAgg, currentCrosscutAgg, currentFlitchAgg] = await Promise.all([
      log_inventory_items_model.aggregate([
        {
          $match: {
            ...itemFilter,
            $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
          },
        },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$physical_cmt' },
          },
        },
      ]),
      crosscutting_done_model.aggregate([
        {
          $match: {
            ...itemFilter,
            $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
          },
        },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$crosscut_cmt' },
          },
        },
      ]),
      flitching_done_model.aggregate([
        {
          $match: {
            ...itemFilter,
            deleted_at: null,
            $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
          },
        },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$flitch_cmt' },
          },
        },
      ]),
    ]);

    const currentAvailableMap = new Map();
    const keyToItem = new Map();
    [...currentLogAgg, ...currentCrosscutAgg, ...currentFlitchAgg].forEach((r) => {
      const key = `${r._id.item_id}_${r._id.item_name}`;
      currentAvailableMap.set(key, (currentAvailableMap.get(key) || 0) + (r.total || 0));
      if (!keyToItem.has(key)) keyToItem.set(key, { item_id: r._id.item_id, item_name: r._id.item_name });
    });
    allItems.forEach((i) => {
      const k = `${i._id.item_id}_${i._id.item_name}`;
      if (!keyToItem.has(k)) keyToItem.set(k, { item_id: i._id.item_id, item_name: i._id.item_name });
    });

    /*********************************************************
     STEP 3a: Received logs (invoice/indian/actual/amount/expense) during period
    *********************************************************/
    const logsReceivedAgg = await log_inventory_items_model.aggregate([
      { $match: { ...itemFilter } },
      {
        $lookup: {
          from: 'log_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'invoice',
        },
      },
      { $unwind: '$invoice' },
      { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          invoice_cmt: { $sum: '$invoice_cmt' },
          indian_cmt: { $sum: '$indian_cmt' },
          actual_cmt: { $sum: '$physical_cmt' },
          amount: { $sum: '$amount' },
          amount_expense: { $sum: '$expense_amount' },
        },
      },
    ]);

    /*********************************************************
     STEP 3b: Current Available Amount (closing balance for amount)
    *********************************************************/
    logsReceivedAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'invoice_cmt', r.invoice_cmt);
      addValue(r._id.item_id, r._id.item_name, 'indian_cmt', r.indian_cmt);
      addValue(r._id.item_id, r._id.item_name, 'actual_cmt', r.actual_cmt);
      addValue(r._id.item_id, r._id.item_name, 'amount', r.amount);
      addValue(r._id.item_id, r._id.item_name, 'amount_expense', r.amount_expense);
    });

    const currentAmountAgg = await log_inventory_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total_amount: { $sum: '$amount' },
          total_expense: { $sum: '$expense_amount' },
        },
      },
    ]);

    const currentAmountMap = new Map();
    const currentExpenseMap = new Map();
    currentAmountAgg.forEach((r) => {
      const key = `${r._id.item_id}_${r._id.item_name}`;
      currentAmountMap.set(key, r.total_amount || 0);
      currentExpenseMap.set(key, r.total_expense || 0);
    });

    /*********************************************************
     STEP 4: Issue for Crosscut
    *********************************************************/
    const issueForCcAgg = await log_inventory_items_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          issue_status: 'crosscutting',
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);

    issueForCcAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'issue_for_cc', r.total)
    );

    /*********************************************************
     STEP 5: Crosscut Issued (forwarded onward)
    *********************************************************/
    const ccIssuedAgg = await crosscutting_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          issue_status: { $ne: null },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);

    ccIssuedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'cc_issued', r.total)
    );

    /*********************************************************
     STEP 6: Crosscut Received (+ cost + expense)
    *********************************************************/
    const ccReceivedAgg = await crosscutting_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$crosscut_cmt' },
          total_cost: { $sum: '$cost_amount' },
          total_expense: { $sum: '$expense_amount' },
        },
      },
    ]);

    ccReceivedAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'cc_received', r.total);
      addValue(r._id.item_id, r._id.item_name, 'cc_received_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'cc_received_expense', r.total_expense);
    });

    /*********************************************************
     STEP 7: Flitch Issued
    *********************************************************/
    const flitchIssuedAgg = await issues_for_flitching_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$cmt' },
        },
      },
    ]);

    flitchIssuedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'flitch_issued', r.total)
    );

    /*********************************************************
     STEP 8: Flitch Received (+ cost + expense)
    *********************************************************/
    const flitchReceivedAgg = await flitching_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$flitch_cmt' },
          total_cost: { $sum: '$cost_amount' },
          total_expense: { $sum: '$expense_amount' },
        },
      },
    ]);

    flitchReceivedAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'flitch_received', r.total);
      addValue(r._id.item_id, r._id.item_name, 'flitch_received_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'flitch_received_expense', r.total_expense);
    });

    /*********************************************************
     STEP 9: Peeling Issued
    *********************************************************/
    const peelingIssuedAgg = await issues_for_peeling_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$cmt' },
          total_cost: { $sum: '$amount' },          // cost at issue time
          total_expense: { $sum: '$expense_amount' }, // expense at issue time
        },
      },
    ]);

    peelingIssuedAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'peeling_issued', r.total);
      addValue(r._id.item_id, r._id.item_name, 'peeling_issued_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'peeling_issued_expense', r.total_expense);
    });

    /*********************************************************
     STEP 10: Peeling Received (CMT, allocated proportionally)
     + Peeling cost/expense (summed directly from peeling_done_items_model,
       which is already itemized per item_name_id / item_name — no allocation needed)
    *********************************************************/
    const peelingReceivedAgg = await peeling_done_other_details_model.aggregate([
      {
        $match: { createdAt: { $gte: start, $lte: end } },
      },
      {
        $lookup: {
          from: "peeling_done_items",
          localField: "_id",
          foreignField: "peeling_done_other_details_id",
          as: "items",
        },
      },
      {
        $addFields: {
          itemsSum: { $sum: '$items.cmt' },
        },
      },
      { $unwind: '$items' },

      ...(filter.item_name
        ? [{ $match: { 'items.item_name': filter.item_name } }]
        : []),

      {
        $addFields: {
          itemShare: {
            $cond: [
              { $eq: ['$itemsSum', 0] },
              0,
              { $divide: ['$items.cmt', '$itemsSum'] },
            ],
          },
        },
      },
      {
        $addFields: {
          allocatedCmt: { $multiply: ['$total_cmt', '$itemShare'] },
        },
      },
      {
        $group: {
          _id: {
            item_id: '$items.item_name_id',
            item_name: '$items.item_name',
          },
          total: { $sum: '$allocatedCmt' },
        },
      },
    ]);

    peelingReceivedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'peeling_received', r.total)
    );

    /*********************************************************
     STEP 10a: Sales (order only) and Job Work Challan (challan only)
     Now also tracks cost (cost_amount/amount) and expense_amount per source.
    *********************************************************/
    const [logOrderAgg, logChallanAgg] = await Promise.all([
      log_inventory_items_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'order', ...itemFilter } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$physical_cmt' },
            total_cost: { $sum: '$amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]),
      log_inventory_items_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'challan', ...itemFilter } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$physical_cmt' },
            total_cost: { $sum: '$amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]),
    ]);
    logOrderAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'sales', r.total);
      addValue(r._id.item_id, r._id.item_name, 'sales_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'sales_expense', r.total_expense);
    });
    logChallanAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan', r.total);
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan_expense', r.total_expense);
    });

    const [crosscutOrderAgg, crosscutChallanAgg] = await Promise.all([
      crosscutting_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'order', ...itemFilter } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$crosscut_cmt' },
            total_cost: { $sum: '$cost_amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]),
      crosscutting_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'challan', ...itemFilter } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$crosscut_cmt' },
            total_cost: { $sum: '$cost_amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]),
    ]);
    crosscutOrderAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'sales', r.total);
      addValue(r._id.item_id, r._id.item_name, 'sales_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'sales_expense', r.total_expense);
    });
    crosscutChallanAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan', r.total);
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan_expense', r.total_expense);
    });

    const [flitchOrderAgg, flitchChallanAgg] = await Promise.all([
      flitching_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, deleted_at: null, issue_status: 'order', ...itemFilter } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$flitch_cmt' },
            total_cost: { $sum: '$cost_amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]),
      flitching_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, deleted_at: null, issue_status: 'challan', ...itemFilter } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total: { $sum: '$flitch_cmt' },
            total_cost: { $sum: '$cost_amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]),
    ]);
    flitchOrderAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'sales', r.total);
      addValue(r._id.item_id, r._id.item_name, 'sales_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'sales_expense', r.total_expense);
    });
    flitchChallanAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan', r.total);
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'job_work_challan_expense', r.total_expense);
    });

    /*********************************************************
     STEP 10b: Rejected (Cc+Flitch+Peeling) — CMT + cost/expense
    *********************************************************/
    const rejectedCrosscutAgg = await rejected_crosscutting_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$rejected_quantity.physical_cmt' },
          total_cost: { $sum: '$cost_amount' },
          total_expense: { $sum: '$expense_amount' },
        },
      },
    ]);
    rejectedCrosscutAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total);
      addValue(r._id.item_id, r._id.item_name, 'rejected_cost', r.total_cost);
      addValue(r._id.item_id, r._id.item_name, 'rejected_expense', r.total_expense);
    });

    const rejectedFlitchAgg = await flitching_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $addFields: {
          wastageCmt: {
            $multiply: [
              { $ifNull: ['$wastage_info.wastage_sqm', 0] },
              { $ifNull: ['$sqm_factor', 1] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$wastageCmt' },
        },
      },
    ]);
    rejectedFlitchAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total);
    });

    const rejectedPeelingAgg = await issues_for_peeling_wastage_model.aggregate([
      {
        $match: { createdAt: { $gte: start, $lte: end } },
      },
      {
        $lookup: {
          from: 'issues_for_peelings',
          localField: 'issue_for_peeling_id',
          foreignField: '_id',
          as: 'issue',
        },
      },
      { $unwind: '$issue' },
      ...(filter.item_name
        ? [{ $match: { 'issue.item_name': filter.item_name } }]
        : []),
      {
        $group: {
          _id: { item_id: '$issue.item_id', item_name: '$issue.item_name' },
          total: { $sum: '$cmt' },
        },
      },
    ]);
    rejectedPeelingAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total);
    });

    /*********************************************************
     STEP 10c: Received/Issued AFTER period – to reconstruct period-end closing
    *********************************************************/
    const now = new Date();
    const isCurrentPeriod = end >= now;

    let receivedAfterMap = new Map();
    let issuedAfterMap = new Map();
    let receivedAmountAfterMap = new Map();
    let receivedExpenseAfterMap = new Map();
    let issuedAmountAfterMap = new Map();
    let issuedExpenseAfterMap = new Map();

    if (!isCurrentPeriod) {
      const [recAfter, issueCcAfter, flitchAfter, peelAfter, salesAfter, rejCcAfter, rejFlitchAfter, rejPeelAfter] = await Promise.all([
        log_inventory_items_model.aggregate([
          { $match: { ...itemFilter } },
          { $lookup: { from: 'log_inventory_invoice_details', localField: 'invoice_id', foreignField: '_id', as: 'invoice' } },
          { $unwind: '$invoice' },
          { $match: { 'invoice.inward_date': { $gt: end } } },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$physical_cmt' } } },
        ]),
        log_inventory_items_model.aggregate([
          { $match: { ...itemFilter, issue_status: 'crosscutting', updatedAt: { $gt: end } } },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$physical_cmt' } } },
        ]),
        issues_for_flitching_model.aggregate([
          { $match: { ...itemFilter, createdAt: { $gt: end } } },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$cmt' } } },
        ]),
        issues_for_peeling_model.aggregate([
          { $match: { ...itemFilter, createdAt: { $gt: end } } },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$cmt' } } },
        ]),
        log_inventory_items_model.aggregate([
          { $match: { ...itemFilter, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$physical_cmt' } } },
        ]),
        rejected_crosscutting_model.aggregate([
          { $match: { ...itemFilter, createdAt: { $gt: end } } },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$rejected_quantity.physical_cmt' } } },
        ]),
        flitching_done_model.aggregate([
          {
            $match: { ...itemFilter, deleted_at: null, createdAt: { $gt: end } },
          },
          {
            $addFields: {
              wastageCmt: {
                $multiply: [
                  { $ifNull: ['$wastage_info.wastage_sqm', 0] },
                  { $ifNull: ['$sqm_factor', 1] },
                ],
              },
            },
          },
          { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$wastageCmt' } } },
        ]),
        issues_for_peeling_wastage_model.aggregate([
          { $match: { createdAt: { $gt: end } } },
          { $lookup: { from: 'issues_for_peelings', localField: 'issue_for_peeling_id', foreignField: '_id', as: 'issue' } },
          { $unwind: '$issue' },
          ...(filter.item_name ? [{ $match: { 'issue.item_name': filter.item_name } }] : []),
          { $group: { _id: { item_id: '$issue.item_id', item_name: '$issue.item_name' }, total: { $sum: '$cmt' } } },
        ]),
      ]);

      // After-period amount received (new invoices after end date)
      const recAmountAfter = await log_inventory_items_model.aggregate([
        { $match: { ...itemFilter } },
        { $lookup: { from: 'log_inventory_invoice_details', localField: 'invoice_id', foreignField: '_id', as: 'invoice' } },
        { $unwind: '$invoice' },
        { $match: { 'invoice.inward_date': { $gt: end } } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total_amount: { $sum: '$amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]);

      // After-period amount issued (sales + challan after end date)
      const issuedAmountAfter = await log_inventory_items_model.aggregate([
        { $match: { ...itemFilter, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
        {
          $group: {
            _id: { item_id: '$item_id', item_name: '$item_name' },
            total_amount: { $sum: '$amount' },
            total_expense: { $sum: '$expense_amount' },
          },
        },
      ]);

      recAmountAfter.forEach((x) => {
        const k = `${x._id.item_id}_${x._id.item_name}`;
        receivedAmountAfterMap.set(k, (receivedAmountAfterMap.get(k) || 0) + (x.total_amount || 0));
        receivedExpenseAfterMap.set(k, (receivedExpenseAfterMap.get(k) || 0) + (x.total_expense || 0));
      });
      issuedAmountAfter.forEach((x) => {
        const k = `${x._id.item_id}_${x._id.item_name}`;
        issuedAmountAfterMap.set(k, (issuedAmountAfterMap.get(k) || 0) + (x.total_amount || 0));
        issuedExpenseAfterMap.set(k, (issuedExpenseAfterMap.get(k) || 0) + (x.total_expense || 0));
      });

      const crosscutSalesAfter = await crosscutting_done_model.aggregate([
        { $match: { ...itemFilter, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$crosscut_cmt' } } },
      ]);
      const flitchSalesAfter = await flitching_done_model.aggregate([
        { $match: { ...itemFilter, deleted_at: null, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$flitch_cmt' } } },
      ]);

      recAfter.forEach((x) => {
        const k = `${x._id.item_id}_${x._id.item_name}`;
        receivedAfterMap.set(k, (receivedAfterMap.get(k) || 0) + (x.total || 0));
      });
      [issueCcAfter, flitchAfter, peelAfter, salesAfter, rejCcAfter, rejFlitchAfter, rejPeelAfter, crosscutSalesAfter, flitchSalesAfter].forEach((arr) => {
        arr.forEach((x) => {
          const k = `${x._id.item_id}_${x._id.item_name}`;
          issuedAfterMap.set(k, (issuedAfterMap.get(k) || 0) + (x.total || 0));
        });
      });
    }

    /*********************************************************
     STEP 11: Build Final Report
    *********************************************************/
    const itemsInPeriod = new Set(
      logsReceivedAgg.map((r) => `${r._id.item_id}_${r._id.item_name}`)
    );
    const mergedKeys = new Set();
    reportMap.forEach((_, k) => {
      if (itemsInPeriod.has(k)) mergedKeys.add(k);
    });
    currentAvailableMap.forEach((_, k) => {
      if (itemsInPeriod.has(k)) mergedKeys.add(k);
    });

    const report = Array.from(mergedKeys).map((key) => {
      const r = reportMap.get(key) || { ...keyToItem.get(key), ...FIELD_DEFAULTS };
      const currentAvailable = currentAvailableMap.get(key) || 0;
      const received = r.actual_cmt || 0;
      const received_amount = r.amount || 0;
      const received_expense = r.amount_expense || 0;

      const issued =
        (r.issue_for_cc || 0) +
        (r.flitch_issued || 0) +
        (r.peeling_issued || 0) +
        (r.sales || 0) +
        (r.job_work_challan || 0) +
        (r.rejected || 0);

      const issued_amount =
        (r.sales_cost || 0) +
        (r.job_work_challan_cost || 0) +
        (r.rejected_cost || 0) +
        (r.cc_received_cost || 0) +
        (r.flitch_received_cost || 0) +
        (r.peeling_received_cost || 0) +
        (r.peeling_issued_cost || 0);

      const issued_expense =
        (r.sales_expense || 0) +
        (r.job_work_challan_expense || 0) +
        (r.rejected_expense || 0) +
        (r.cc_received_expense || 0) +
        (r.flitch_received_expense || 0) +
        (r.peeling_received_expense || 0) +
        (r.peeling_issued_expense || 0);

      const periodEndClosing = isCurrentPeriod
        ? currentAvailable
        : Math.max(0, currentAvailable - (receivedAfterMap.get(key) || 0) + (issuedAfterMap.get(key) || 0));
      const opening_stock_cmt = Math.max(0, periodEndClosing + issued - received);
      const closing_stock_cmt = opening_stock_cmt + received - issued;
      const currentAmount = currentAmountMap.get(key) || 0;
      const currentExpense = currentExpenseMap.get(key) || 0;

      const periodEndClosingAmount = isCurrentPeriod
        ? currentAmount
        : Math.max(0, currentAmount - (receivedAmountAfterMap.get(key) || 0) + (issuedAmountAfterMap.get(key) || 0));

      const periodEndClosingExpense = isCurrentPeriod
        ? currentExpense
        : Math.max(0, currentExpense - (receivedExpenseAfterMap.get(key) || 0) + (issuedExpenseAfterMap.get(key) || 0));

      const opening_amount = Math.max(0, periodEndClosingAmount + issued_amount - received_amount);
      const opening_expense = Math.max(0, periodEndClosingExpense + issued_expense - received_expense);

      const closing_amount = opening_amount + received_amount - issued_amount;
      const closing_expense = opening_expense + received_expense - issued_expense;

      return {
        item_id: r.item_id,
        item_name: r.item_name,
        opening_stock_cmt,
        opening_amount,
        opening_expense,
        invoice_cmt: r.invoice_cmt,
        indian_cmt: r.indian_cmt,
        actual_cmt: r.actual_cmt,
        amount: r.amount,
        amount_expense: r.amount_expense,
        recover_from_rejected: r.recover_from_rejected,
        issue_for_cc: r.issue_for_cc,
        cc_received: r.cc_received,
        cc_received_cost: r.cc_received_cost,
        cc_received_expense: r.cc_received_expense,
        cc_issued: r.cc_issued,
        cc_diff: r.issue_for_cc - r.cc_received,
        issue_for_flitch: r.flitch_issued,
        flitch_received: r.flitch_received,
        flitch_received_cost: r.flitch_received_cost,
        flitch_received_expense: r.flitch_received_expense,
        flitch_diff: r.flitch_issued - r.flitch_received,
        issue_for_sqedge: r.issue_for_sqedge,
        peeling_issued: r.peeling_issued,
        peeling_received: r.peeling_received,
        peeling_issued_cost: r.peeling_issued_cost,
        peeling_issued_expense: r.peeling_issued_expense,
        peeling_received_cost: r.peeling_received_cost,
        peeling_received_expense: r.peeling_received_expense,
        peeling_diff: r.peeling_issued - r.peeling_received,
        sales: r.sales,
        sales_cost: r.sales_cost,
        sales_expense: r.sales_expense,
        job_work_challan: r.job_work_challan,
        job_work_challan_cost: r.job_work_challan_cost,
        job_work_challan_expense: r.job_work_challan_expense,
        rejected: r.rejected,
        rejected_cost: r.rejected_cost,
        rejected_expense: r.rejected_expense,
        closing_stock_cmt,
        closing_amount,
        closing_expense,
      };
    });

    // console.log('Final Report Data:', report); 

    if (!report.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No stock data found for the selected period'));
    }

    /*********************************************************
     STEP 12: Generate Excel
    *********************************************************/
    const excelLink = await createItemWiseInwardReportExcel(
      report,
      startDate,
      endDate,
      filter,
      includeCostAndExpense
    );

    return res.json(
      new ApiResponse(
        200,
        'Item wise inward report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});