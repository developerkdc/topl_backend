import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import { peeling_done_other_details_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { createItemWiseFlitchReportExcel } from '../../../config/downloadExcel/reports2/Flitch/itemWiseFlitch.js';

/**
 * Item Wise Flitch Report Export
 * Generates a 20-column Excel report with grouped headers:
 * Round Log Detail CMT (Invoice, Indian, Actual), Recover From rejected,
 * Cross Cut Details CMT (Issue for CC, CC Received, CC Issue, CC Diff),
 * Flitch Details CMT, Peeling Details CMT, Issue for Sq.Edge,
 * Round log +Cross Cut (Sales), (Cc+Flitch+Peeling) (Rejected), Closing Stock CMT.
 *
 * @route POST /api/V1/reports2/flitch/download-excel-item-wise-flitch-report
 * @access Private
 */
export const ItemWiseFlitchReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Item Wise Flitch Report Request - Start Date:', startDate);
  console.log('Item Wise Flitch Report Request - End Date:', endDate);
  console.log('Item Wise Flitch Report Request - Filter:', filter);

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
    /*************************************************************
     * STEP 1: Get unique item names inwarded in date range
     * (log inward: log_inventory + invoice.inward_date)
     * (flitch inward: flitch_inventory + invoice.inward_date)
     *************************************************************/
    const [logInwardItems, flitchInwardItems] = await Promise.all([
      log_inventory_items_model.aggregate([
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
        { $group: { _id: '$item_name' } },
      ]),
      flitch_inventory_items_model.aggregate([
        { $match: { ...itemFilter } },
        {
          $lookup: {
            from: 'flitch_inventory_invoice_details',
            localField: 'invoice_id',
            foreignField: '_id',
            as: 'invoice',
          },
        },
        { $unwind: '$invoice' },
        { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
        { $group: { _id: '$item_name' } },
      ]),
    ]);

    const itemNames = [...new Set(
      [...logInwardItems, ...flitchInwardItems].map((i) => i._id).filter(Boolean)
    )];

    if (itemNames.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No inward data found for the selected period'));
    }

    /*************************************************************
     * STEP 2: Initialize report map – pre-seed all known items
     * 20-column shape (with CC fields; no job_work_challan)
     *************************************************************/
    const reportMap = new Map();

    const getEntry = (item_name) => {
      if (!reportMap.has(item_name)) {
        reportMap.set(item_name, {
          item_name,
          opening_stock_cmt: 0,
          invoice_cmt: 0,
          indian_cmt: 0,
          actual_cmt: 0,
          recover_from_rejected: 0,
          issue_for_cc: 0,
          cc_received: 0,
          cc_issued: 0,
          issue_for_flitch: 0,
          flitch_received: 0,
          issue_for_peeling: 0,
          peeling_received: 0,
          issue_for_sqedge: 0,
          sales: 0,
          rejected: 0,
        });
      }
      return reportMap.get(item_name);
    };

    const addValue = (item_name, field, value) => {
      const entry = getEntry(item_name);
      entry[field] += value || 0;
    };

    itemNames.forEach((name) => getEntry(name));

    /*************************************************************
     * STEP 3: Opening Stock + Round Log Details (Invoice/Indian/Actual)
     * Single aggregation: logs with inward_date in period
     *************************************************************/
    const logsInPeriodAgg = await log_inventory_items_model.aggregate([
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
          _id: '$item_name',
          opening_stock_cmt: { $sum: '$physical_cmt' },
          invoice_cmt: { $sum: '$invoice_cmt' },
          indian_cmt: { $sum: '$indian_cmt' },
          actual_cmt: { $sum: '$physical_cmt' },
        },
      },
    ]);
    logsInPeriodAgg.forEach((r) => {
      addValue(r._id, 'opening_stock_cmt', r.opening_stock_cmt);
      addValue(r._id, 'invoice_cmt', r.invoice_cmt);
      addValue(r._id, 'indian_cmt', r.indian_cmt);
      addValue(r._id, 'actual_cmt', r.actual_cmt);
    });

    /*************************************************************
     * STEP 4: Issue for CC
     *************************************************************/
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
          _id: '$item_name',
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);
    issueForCcAgg.forEach((r) => addValue(r._id, 'issue_for_cc', r.total));

    /*************************************************************
     * STEP 5: CC Issued (forwarded from crosscutting stage)
     *************************************************************/
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
          _id: '$item_name',
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);
    ccIssuedAgg.forEach((r) => addValue(r._id, 'cc_issued', r.total));

    /*************************************************************
     * STEP 6: CC Received
     *************************************************************/
    const ccReceivedAgg = await crosscutting_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);
    ccReceivedAgg.forEach((r) => addValue(r._id, 'cc_received', r.total));

    /*************************************************************
     * STEP 7: Issue for Flitch
     *************************************************************/
    const flitchIssuedAgg = await issues_for_flitching_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$cmt' },
        },
      },
    ]);
    flitchIssuedAgg.forEach((r) => addValue(r._id, 'issue_for_flitch', r.total));

    /*************************************************************
     * STEP 8: Flitch Received
     *************************************************************/
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
          _id: '$item_name',
          total: { $sum: '$flitch_cmt' },
        },
      },
    ]);
    flitchReceivedAgg.forEach((r) => addValue(r._id, 'flitch_received', r.total));

    /*************************************************************
     * STEP 9: Issue for Peeling
     *************************************************************/
    const peelingIssuedAgg = await issues_for_peeling_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$cmt' },
        },
      },
    ]);
    peelingIssuedAgg.forEach((r) => addValue(r._id, 'issue_for_peeling', r.total));

    /*************************************************************
     * STEP 10: Peeling Received
     *************************************************************/
    const peelingReceivedAgg = await peeling_done_other_details_model.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'peeling_done_items',
          localField: '_id',
          foreignField: 'peeling_done_other_details_id',
          as: 'items',
        },
      },
      { $unwind: '$items' },
      ...(filter.item_name ? [{ $match: { 'items.item_name': filter.item_name } }] : []),
      {
        $group: {
          _id: '$items.item_name',
          total: { $sum: '$items.cmt' },
        },
      },
    ]);
    peelingReceivedAgg.forEach((r) => addValue(r._id, 'peeling_received', r.total));

    /*************************************************************
     * STEP 11: Sales – log + crosscut + flitch (order/challan in period)
     *************************************************************/
    const logSalesAgg = await log_inventory_items_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          issue_status: { $in: ['order', 'challan'] },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);
    logSalesAgg.forEach((r) => addValue(r._id, 'sales', r.total));

    const crosscutSalesAgg = await crosscutting_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          issue_status: { $in: ['order', 'challan'] },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);
    crosscutSalesAgg.forEach((r) => addValue(r._id, 'sales', r.total));

    const flitchSalesAgg = await flitching_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          deleted_at: null,
          issue_status: { $in: ['order', 'challan'] },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$flitch_cmt' },
        },
      },
    ]);
    flitchSalesAgg.forEach((r) => addValue(r._id, 'sales', r.total));

    /*************************************************************
     * STEP 12: Rejected – crosscut + flitch + peeling (is_rejected in period)
     *************************************************************/
    const rejectedCrosscutAgg = await crosscutting_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          is_rejected: true,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);
    rejectedCrosscutAgg.forEach((r) => addValue(r._id, 'rejected', r.total));

    const rejectedFlitchAgg = await flitching_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          deleted_at: null,
          is_rejected: true,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$flitch_cmt' },
        },
      },
    ]);
    rejectedFlitchAgg.forEach((r) => addValue(r._id, 'rejected', r.total));

    const rejectedPeelingAgg = await peeling_done_other_details_model.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, is_rejected: true } },
      {
        $lookup: {
          from: 'peeling_done_items',
          localField: '_id',
          foreignField: 'peeling_done_other_details_id',
          as: 'items',
        },
      },
      { $unwind: '$items' },
      ...(filter.item_name ? [{ $match: { 'items.item_name': filter.item_name } }] : []),
      {
        $group: {
          _id: '$items.item_name',
          total: { $sum: '$items.cmt' },
        },
      },
    ]);
    rejectedPeelingAgg.forEach((r) => addValue(r._id, 'rejected', r.total));

    /*************************************************************
     * STEP 13: Closing Stock – logs in period that have been issued
     *************************************************************/
    const closingAgg = await log_inventory_items_model.aggregate([
      { $match: { ...itemFilter, issue_status: { $ne: null } } },
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
          _id: '$item_name',
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);
    const closingMap = new Map();
    closingAgg.forEach((r) => closingMap.set(r._id, r.total));

    /*************************************************************
     * STEP 14: Build final 20-field report rows (items inwarded in period)
     *************************************************************/
    const itemNamesSet = new Set(itemNames);
    const report = Array.from(reportMap.values())
      .filter((r) => itemNamesSet.has(r.item_name))
      .map((r) => ({
      item_name:             r.item_name,
      opening_stock_cmt:     r.opening_stock_cmt,
      invoice_cmt:           r.invoice_cmt,
      indian_cmt:            r.indian_cmt,
      actual_cmt:            r.actual_cmt,
      recover_from_rejected: r.recover_from_rejected,
      issue_for_cc:          r.issue_for_cc,
      cc_received:           r.cc_received,
      cc_issued:             r.cc_issued,
      cc_diff:               r.issue_for_cc - r.cc_received,
      issue_for_flitch:      r.issue_for_flitch,
      flitch_received:       r.flitch_received,
      flitch_diff:           r.issue_for_flitch - r.flitch_received,
      issue_for_peeling:     r.issue_for_peeling,
      peeling_received:      r.peeling_received,
      peeling_diff:          r.issue_for_peeling - r.peeling_received,
      issue_for_sqedge:      r.issue_for_sqedge,
      sales:                 r.sales,
      rejected:              r.rejected,
      closing_stock_cmt:     Math.max(
        0,
        (closingMap.get(r.item_name) || 0) - r.opening_stock_cmt
      ),
    }));

    const activeReport = report.filter(
      (item) =>
        item.opening_stock_cmt > 0 ||
        item.invoice_cmt > 0 ||
        item.actual_cmt > 0 ||
        item.issue_for_cc > 0 ||
        item.cc_received > 0 ||
        item.issue_for_flitch > 0 ||
        item.flitch_received > 0 ||
        item.issue_for_peeling > 0 ||
        item.peeling_received > 0 ||
        item.sales > 0 ||
        item.rejected > 0 ||
        item.closing_stock_cmt > 0
    );

    if (activeReport.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No inward data found for the selected period'));
    }

    const excelLink = await createItemWiseFlitchReportExcel(
      activeReport,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(200, 'Item wise flitch report generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating item wise flitch report:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
