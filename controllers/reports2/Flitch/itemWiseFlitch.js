import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { issued_for_slicing_model } from '../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import { slicing_done_other_details_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import issue_for_slicing_wastage_model from '../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_wastage_schema.js';
import { createItemWiseFlitchReportExcel } from '../../../config/downloadExcel/reports2/Flitch/itemWiseFlitch.js';

/** Issue − received style variances are never negative in the report output. */
function nonNegativeDiff(minuend, subtrahend) {
  const a = parseFloat(minuend) || 0;
  const b = parseFloat(subtrahend) || 0;
  return Math.max(0, a - b);
}

/**
 * Item Wise Flitch Report Export
 * Generates a 16-column Excel report with grouped headers:
 * Round Log Detail CMT (Invoice=0, Indian=0, Actual), Recover From rejected=0,
 * Flitch Details CMT (Issue for Flitch, Flitch Received, Flitch Diff),
 * Slicing Details CMT (Issue for Slicing, Slicing Received, Slicing Diff),
 * Issue for Sq.Edge=0, Sales, Rejected (includes slicing wastage), Closing Stock CMT.
 * Data sourced exclusively from flitching_done records + slicing tables.
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
     * STEP 1: Get unique item names from flitching_done in date range
     * Using worker_details.flitching_date as the date filter
     *************************************************************/
    const flitchedItems = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      { $group: { _id: '$item_name' } },
    ]);

    const openingStockItems = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $lt: start },
          issue_status: null,
          deleted_at: null,
          ...itemFilter,
        },
      },
      { $group: { _id: '$item_name' } },
    ]);

    const allItemNameDocs = [...flitchedItems, ...openingStockItems];
    const itemNames = [...new Set(allItemNameDocs.map((i) => i._id).filter(Boolean))];

    if (itemNames.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No inward data found for the selected period'));
    }

    /*************************************************************
     * STEP 2: Initialize report map – pre-seed all known items
     * 16-column shape (flitching-focused + slicing, no peeling)
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
          issue_for_flitch: 0,
          flitch_received: 0,
          issue_for_slicing: 0,
          slicing_received: 0,
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
     * STEP 3: Opening Stock CMT + Round Log Detail CMT (Invoice, Indian, Actual)
     * Determine source by checking crosscut_done_id:
     * - If crosscut_done_id IS NULL → came from LOG
     * - If crosscut_done_id IS NOT NULL → came from CROSSCUT
     *************************************************************/
    
    // Opening Stock: flitching_done with issue_status=null created BEFORE start date
    const openingStockAgg = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $lt: start },
          issue_status: null,
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
    openingStockAgg.forEach((r) => addValue(r._id, 'opening_stock_cmt', r.total));

    // Round Log Detail CMT from items flitched IN period (LOG sources)
    const roundLogDetailFromLogAgg = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $gte: start, $lte: end },
          deleted_at: null,
          crosscut_done_id: null,
          ...itemFilter,
        },
      },
      {
        $lookup: {
          from: 'log_inventory_items_details',
          localField: 'log_inventory_item_id',
          foreignField: '_id',
          as: 'log_data',
        },
      },
      { $unwind: '$log_data' },
      {
        $group: {
          _id: '$item_name',
          invoice_cmt: { $sum: '$log_data.invoice_cmt' },
          indian_cmt: { $sum: '$log_data.indian_cmt' },
          actual_cmt: { $sum: '$log_data.physical_cmt' },
        },
      },
    ]);
    roundLogDetailFromLogAgg.forEach((r) => {
      addValue(r._id, 'invoice_cmt', r.invoice_cmt);
      addValue(r._id, 'indian_cmt', r.indian_cmt);
      addValue(r._id, 'actual_cmt', r.actual_cmt);
    });

    // Round Log Detail CMT from items flitched IN period (CROSSCUT sources)
    const roundLogDetailFromCrossAgg = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $gte: start, $lte: end },
          deleted_at: null,
          crosscut_done_id: { $ne: null },
          ...itemFilter,
        },
      },
      {
        $lookup: {
          from: 'crosscutting_done',
          localField: 'crosscut_done_id',
          foreignField: '_id',
          as: 'crosscut_data',
        },
      },
      { $unwind: '$crosscut_data' },
      {
        $group: {
          _id: '$item_name',
          actual_cmt: { $sum: '$crosscut_data.crosscut_cmt' },
        },
      },
    ]);
    roundLogDetailFromCrossAgg.forEach((r) => {
      addValue(r._id, 'invoice_cmt', 0);
      addValue(r._id, 'indian_cmt', 0);
      addValue(r._id, 'actual_cmt', r.actual_cmt);
    });



    /*************************************************************
     * STEP 4: Issue for Flitch (from issues_for_flitching_model.createdAt)
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
     * STEP 5: Flitch Received (from flitching_done using worker_details.flitching_date)
     *************************************************************/
    const flitchReceivedAgg = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $gte: start, $lte: end },
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
     * STEP 6: Issue for Slicing (from issued_for_slicing_model.createdAt)
     *************************************************************/
    const slicingIssuedAgg = await issued_for_slicing_model.aggregate([
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
    slicingIssuedAgg.forEach((r) => addValue(r._id, 'issue_for_slicing', r.total));

    /*************************************************************
     * STEP 7: Slicing Received (from slicing_done_other_details_model.total_cmt)
     * Using slicing_date as date filter; join to issued_for_slicing for item_name
     *************************************************************/
    const slicingReceivedAgg = await slicing_done_other_details_model.aggregate([
      {
        $match: {
          slicing_date: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: 'issued_for_slicings',
          localField: 'issue_for_slicing_id',
          foreignField: '_id',
          as: 'slicing_issue',
        },
      },
      { $unwind: '$slicing_issue' },
      ...(itemFilter.item_name ? [{ $match: { 'slicing_issue.item_name': itemFilter.item_name } }] : []),
      {
        $group: {
          _id: '$slicing_issue.item_name',
          total: { $sum: '$total_cmt' },
        },
      },
    ]);
    slicingReceivedAgg.forEach((r) => addValue(r._id, 'slicing_received', r.total));



    /*************************************************************
     * STEP 8: Sales – flitching_done with issue_status in [order, challan]
     * Using worker_details.flitching_date for date filtering
     *************************************************************/
    const flitchSalesAgg = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $gte: start, $lte: end },
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
     * STEP 9: Rejected – flitching_done wastage_info.wastage_sqm + slicing_wastage
     * Using worker_details.flitching_date for flitching; createdAt for wastage
     *************************************************************/
    const rejectedFlitchAgg = await flitching_done_model.aggregate([
      {
        $match: {
          'worker_details.flitching_date': { $gte: start, $lte: end },
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: '$item_name',
          total: { $sum: '$wastage_info.wastage_sqm' },
        },
      },
    ]);
    rejectedFlitchAgg.forEach((r) => addValue(r._id, 'rejected', r.total));

    // Add slicing wastage to rejected
    const rejectedSlicingWastageAgg = await issue_for_slicing_wastage_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: 'issued_for_slicings',
          localField: 'issue_for_slicing_id',
          foreignField: '_id',
          as: 'slicing_issue',
        },
      },
      { $unwind: '$slicing_issue' },
      ...(itemFilter.item_name ? [{ $match: { 'slicing_issue.item_name': itemFilter.item_name } }] : []),
      {
        $group: {
          _id: '$slicing_issue.item_name',
          total: { $sum: '$cmt' },
        },
      },
    ]);
    rejectedSlicingWastageAgg.forEach((r) => addValue(r._id, 'rejected', r.total));

    /*************************************************************
     * STEP 10: No separate query needed; closing calculated in STEP 11
     * Formula: Closing Stock = Opening Stock + Flitch Received - Issue for Slicing - Sales
     */

    /*************************************************************
     * STEP 11: Build final 16-field report rows (items flitched in period)
     *************************************************************/
    const itemNamesSet = new Set(itemNames);
    const report = Array.from(reportMap.values())
      .filter((r) => itemNamesSet.has(r.item_name))
      .map((r) => ({
        item_name:             r.item_name,
        opening_stock_cmt:     r.opening_stock_cmt,
        invoice_cmt:           r.invoice_cmt,        // Hard-coded 0
        indian_cmt:            r.indian_cmt,         // Hard-coded 0
        actual_cmt:            r.actual_cmt,
        recover_from_rejected: r.recover_from_rejected, // Hard-coded 0
        issue_for_flitch:      r.issue_for_flitch,
        flitch_received:       r.flitch_received,
        flitch_diff:           nonNegativeDiff(r.issue_for_flitch, r.flitch_received),
        issue_for_slicing:     r.issue_for_slicing,
        slicing_received:      r.slicing_received,
        slicing_diff:          nonNegativeDiff(r.issue_for_slicing, r.slicing_received),
        issue_for_sqedge:      r.issue_for_sqedge,     // Hard-coded 0
        sales:                 r.sales,
        rejected:              r.rejected,
        closing_stock_cmt:     Math.max(0, r.opening_stock_cmt + r.flitch_received - r.issue_for_slicing - r.sales),
      }));

    const activeReport = report.filter(
      (item) =>
        item.opening_stock_cmt > 0 ||
        item.actual_cmt > 0 ||
        item.issue_for_flitch > 0 ||
        item.flitch_received > 0 ||
        item.issue_for_slicing > 0 ||
        item.slicing_received > 0 ||
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
