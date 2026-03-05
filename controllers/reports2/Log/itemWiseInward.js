import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { issues_for_crosscutting_model } from '../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import { peeling_done_other_details_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { createItemWiseInwardReportExcel } from '../../../config/downloadExcel/reports2/Log/itemWiseInward.js';

/**
 * Item Wise Inward Daily Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * 
 * @route POST /api/V1/reports2/download-excel-item-wise-inward-daily-report
 * @access Private
 */
// export const ItemWiseInwardDailyReportExcel = catchAsync(async (req, res, next) => {
//   const { startDate, endDate, filter = {} } = req.body;

//   console.log('Item Wise Inward Report Request - Start Date:', startDate);
//   console.log('Item Wise Inward Report Request - End Date:', endDate);
//   console.log('Item Wise Inward Report Request - Filter:', filter);

//   // Validate required parameters
//   if (!startDate || !endDate) {
//     return next(new ApiError('Start date and end date are required', 400));
//   }

//   // Parse dates
//   const start = new Date(startDate);
//   const end = new Date(endDate);
//   end.setHours(23, 59, 59, 999); // Include full end date

//   if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//     return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
//   }

//   if (start > end) {
//     return next(new ApiError('Start date cannot be after end date', 400));
//   }

//   // Build filter for item_name if provided
//   const itemFilter = {};
//   if (filter.item_name) {
//     itemFilter.item_name = filter.item_name;
//   }

//   try {
//     // Step 1: Get all unique item names from log inventory
//     const allItemNames = await log_inventory_items_model.aggregate([
//       {
//         $match: itemFilter,
//       },
//       {
//         $group: {
//           _id: '$item_name',
//         },
//       },
//     ]);

//     const itemNames = allItemNames.map((i) => i._id).filter((name) => name);

//     if (itemNames.length === 0) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             404,
//             'No stock data found for the selected period'
//           )
//         );
//     }

//     // Step 2: For each item name, calculate stock movements
//     const stockData = await Promise.all(
//       itemNames.map(async (item_name) => {
//         // Get current available CMT from log_inventory (where issue_status = null)
//         const currentLogCmt = await log_inventory_items_model.aggregate([
//           {
//             $match: {
//               item_name,
//               $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$physical_cmt' },
//             },
//           },
//         ]);

//         // Get current available CMT from crosscutting_done (where issue_status = null)
//         const currentCrosscutCmt = await crosscutting_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$crosscut_cmt' },
//             },
//           },
//         ]);

//         // Get current available CMT from flitching_done (where issue_status = null)
//         const currentFlitchCmt = await flitching_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               deleted_at: null,
//               $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$flitch_cmt' },
//             },
//           },
//         ]);

//         const currentAvailableCmt =
//           (currentLogCmt[0]?.total_cmt || 0) +
//           (currentCrosscutCmt[0]?.total_cmt || 0) +
//           (currentFlitchCmt[0]?.total_cmt || 0);

//         // ROUND LOG DETAILS - Logs received during period (Invoice/Indian/Actual CMT)
//         const logsReceived = await log_inventory_items_model.aggregate([
//           {
//             $match: {
//               item_name,
//             },
//           },
//           {
//             $lookup: {
//               from: 'log_inventory_invoice_details',
//               localField: 'invoice_id',
//               foreignField: '_id',
//               as: 'invoice',
//             },
//           },
//           {
//             $unwind: '$invoice',
//           },
//           {
//             $match: {
//               'invoice.inward_date': { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               invoice_cmt: { $sum: '$invoice_cmt' },
//               indian_cmt: { $sum: '$indian_cmt' },
//               actual_cmt: { $sum: '$physical_cmt' },
//             },
//           },
//         ]);

//         const invoiceCmt = logsReceived[0]?.invoice_cmt || 0;
//         const indianCmt = logsReceived[0]?.indian_cmt || 0;
//         const actualCmt = logsReceived[0]?.actual_cmt || 0;

//         // CROSS CUT DETAILS - Issue for CC
//         const issuedForCC = await log_inventory_items_model.aggregate([
//           {
//             $match: {
//               item_name,
//               issue_status: 'crosscutting',
//               updatedAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$physical_cmt' },
//             },
//           },
//         ]);

//         const issueForCc = issuedForCC[0]?.total_cmt || 0;

//         // CC Received - Crosscutting completed during period
//         const ccReceived = await crosscutting_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               createdAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$crosscut_cmt' },
//             },
//           },
//         ]);

//         const ccReceivedCmt = ccReceived[0]?.total_cmt || 0;
//         const diffCmt = issueForCc - ccReceivedCmt;

//         // FLITCHING - Crosscut items issued for flitching
//         const flitchingIssued = await crosscutting_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               issue_status: 'flitching',
//               updatedAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$crosscut_cmt' },
//             },
//           },
//         ]);

//         const flitchingCmt = flitchingIssued[0]?.total_cmt || 0;

//         // PEEL - Crosscut items issued for peeling
//         const peelingIssued = await crosscutting_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               issue_status: 'peeling',
//               updatedAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$crosscut_cmt' },
//             },
//           },
//         ]);

//         const peelCmt = peelingIssued[0]?.total_cmt || 0;

//         // SALES - Items issued to orders/challan from logs
//         const logSales = await log_inventory_items_model.aggregate([
//           {
//             $match: {
//               item_name,
//               issue_status: { $in: ['order', 'challan'] },
//               updatedAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$physical_cmt' },
//             },
//           },
//         ]);

//         // Sales from crosscut items
//         const crosscutSales = await crosscutting_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               issue_status: { $in: ['order', 'challan'] },
//               updatedAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$crosscut_cmt' },
//             },
//           },
//         ]);

//         // Sales from flitch items
//         const flitchSales = await flitching_done_model.aggregate([
//           {
//             $match: {
//               item_name,
//               deleted_at: null,
//               issue_status: { $in: ['order', 'challan'] },
//               updatedAt: { $gte: start, $lte: end },
//             },
//           },
//           {
//             $group: {
//               _id: null,
//               total_cmt: { $sum: '$flitch_cmt' },
//             },
//           },
//         ]);

//         const salesCmt =
//           (logSales[0]?.total_cmt || 0) +
//           (crosscutSales[0]?.total_cmt || 0) +
//           (flitchSales[0]?.total_cmt || 0);

//         // Calculate total issued during period (for opening calculation)
//         const totalIssuedCmt = issueForCc + salesCmt;

//         // Calculate total received during period (for opening calculation)
//         const totalReceivedCmt = actualCmt + ccReceivedCmt;

//         // Opening Balance = Current Available + Issued - Received
//         const openingBalanceCmt = currentAvailableCmt + totalIssuedCmt - totalReceivedCmt;

//         // Closing Balance = Opening + Actual Received - Issue for CC + CC Received - Flitching - Peel - Sales
//         const closingBalanceCmt = openingBalanceCmt + actualCmt - issueForCc + ccReceivedCmt - flitchingCmt - peelCmt - salesCmt;

//         return {
//           item_name,
//           opening_stock_cmt: Math.max(0, openingBalanceCmt),
//           invoice_cmt: invoiceCmt,
//           indian_cmt: indianCmt,
//           actual_cmt: actualCmt,
//           issue_for_cc: issueForCc,
//           cc_received: ccReceivedCmt,
//           diff: diffCmt,
//           flitching: flitchingCmt,
//           sawing: 0, // Placeholder - needs clarification
//           wooden_tile: 0, // Placeholder - needs clarification
//           unedge: 0, // Placeholder - needs clarification
//           peel: peelCmt,
//           sales: salesCmt,
//           closing_stock_cmt: Math.max(0, closingBalanceCmt),
//         };
//       })
//     );

//     // Filter out items with no activity (all zeros)
//     const activeStockData = stockData.filter(
//       (item) =>
//         item.opening_stock_cmt > 0 ||
//         item.invoice_cmt > 0 ||
//         item.indian_cmt > 0 ||
//         item.actual_cmt > 0 ||
//         item.issue_for_cc > 0 ||
//         item.cc_received > 0 ||
//         item.flitching > 0 ||
//         item.peel > 0 ||
//         item.sales > 0 ||
//         item.closing_stock_cmt > 0
//     );

//     if (activeStockData.length === 0) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             404,
//             'No stock data found for the selected period'
//           )
//         );
//     }

//     // Generate Excel file
//     const excelLink = await createItemWiseInwardReportExcel(
//       activeStockData,
//       startDate,
//       endDate,
//       filter
//     );

//     return res.json(
//       new ApiResponse(
//         200,
//         'Item wise inward report generated successfully',
//         excelLink
//       )
//     );
//   } catch (error) {
//     console.error('Error generating item wise inward report:', error);
//     return next(
//       new ApiError(error.message || 'Failed to generate report', 500)
//     );
//   }
// });

export const ItemWiseInwardDailyReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Item Wise Inward Report Request - Start Date:', startDate);
  console.log('Item Wise Inward Report Request - End Date:', endDate);
  console.log('Item Wise Inward Report Request - Filter:', filter);

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  console.log('Parsed Start Date:', start);
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
            item_id: "$item_id",
            item_name: "$item_name",
          },
        },
      },
    ]);

    if (!allItems.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, "No stock data found for the selected period"));
    }

    /*********************************************************
     STEP 2: Helper Map
    *********************************************************/
    const reportMap = new Map();

    const addValue = (item_id, item_name, field, value) => {
      const key = `${item_id}_${item_name}`;

      const existing = reportMap.get(key) || {
        item_id,
        item_name,
        issue_for_cc: 0,
        cc_issued: 0,
        cc_received: 0,
        flitch_issued: 0,
        flitch_received: 0,
        peeling_issued: 0,
        peeling_received: 0,
        // added fields for receipts
        invoice_cmt: 0,
        indian_cmt: 0,
        actual_cmt: 0,
        sales: 0,
        rejected: 0,
        // placeholders for new columns
        recover_from_rejected: 0,
        issue_for_sqedge: 0,
        job_work_challan: 0,
      };

      existing[field] += value || 0;
      reportMap.set(key, existing);
    };

    /*********************************************************
     STEP 3: Opening Stock – logs created between start and end with status null
    *********************************************************/
    const openingAgg = await log_inventory_items_model.aggregate([
      { $match: { ...itemFilter} },
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
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);
    openingAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "opening_stock", r.total)
    );

    /*********************************************************
     STEP 3a: Received logs (invoice/indian/actual) during period
    *********************************************************/
    const logsReceivedAgg = await log_inventory_items_model.aggregate([
      { $match: { ...itemFilter } },
      {
        $lookup: {
          from: "log_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "invoice",
        },
      },
      { $unwind: "$invoice" },
      { $match: { "invoice.inward_date": { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { item_id: "$item_id", item_name: "$item_name" },
          invoice_cmt: { $sum: "$invoice_cmt" },
          indian_cmt: { $sum: "$indian_cmt" },
          actual_cmt: { $sum: "$physical_cmt" },
        },
      },
    ]);

    logsReceivedAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, "invoice_cmt", r.invoice_cmt);
      addValue(r._id.item_id, r._id.item_name, "indian_cmt", r.indian_cmt);
      addValue(r._id.item_id, r._id.item_name, "actual_cmt", r.actual_cmt);
    });

    /*********************************************************
     STEP 4: Issue for Crosscut (IMPORTANT FIX)
    *********************************************************/

    /*********************************************************
     STEP 4: Issue for Crosscut (IMPORTANT FIX)
    *********************************************************/
    const issueForCcAgg = await log_inventory_items_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          issue_status: "crosscutting",
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: "$item_id", item_name: "$item_name" },
          total: { $sum: "$physical_cmt" },
        },
      },
    ]);

    issueForCcAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "issue_for_cc", r.total)
    );

    /*********************************************************
     STEP 5: Crosscut Issued – use crosscutting_done records that have been
     forwarded (issue_status not null). this reflects the amount issued ahead
     from the crosscutting stage rather than the original issue request.
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
          _id: { item_id: "$item_id", item_name: "$item_name" },
          total: { $sum: "$crosscut_cmt" },
        },
      },
    ]);

    ccIssuedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "cc_issued", r.total)
    );

    /*********************************************************
     STEP 6: Crosscut Received
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
          _id: { item_id: "$item_id", item_name: "$item_name" },
          total: { $sum: "$crosscut_cmt" },
        },
      },
    ]);

    ccReceivedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "cc_received", r.total)
    );

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
          _id: { item_id: "$item_id", item_name: "$item_name" },
          total: { $sum: "$cmt" },
        },
      },
    ]);

    flitchIssuedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "flitch_issued", r.total)
    );

    /*********************************************************
     STEP 8: Flitch Received
    *********************************************************/
    const flitchReceivedAgg = await flitching_done_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { item_id: "$item_id", item_name: "$item_name" },
          total: { $sum: "$flitch_cmt" },
        },
      },
    ]);

    flitchReceivedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "flitch_received", r.total)
    );

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
          _id: { item_id: "$item_id", item_name: "$item_name" },
          total: { $sum: "$cmt" },
        },
      },
    ]);

    peelingIssuedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "peeling_issued", r.total)
    );

    /*********************************************************
     STEP 10: Peeling Received
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
      { $unwind: "$items" },

      ...(filter.item_name
        ? [{ $match: { "items.item_name": filter.item_name } }]
        : []),

      {
        $group: {
          _id: {
            item_id: "$items.item_name_id",
            item_name: "$items.item_name",
          },
          total: { $sum: "$items.cmt" },
        },
      },
    ]);

    peelingReceivedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "peeling_received", r.total)
    );

    /*********************************************************
     STEP 10a: Sales – aggregate all orders/challans across stages
    *********************************************************/
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
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);
    logSalesAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'sales', r.total)
    );

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
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);
    crosscutSalesAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'sales', r.total)
    );

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
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$flitch_cmt' },
        },
      },
    ]);
    flitchSalesAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'sales', r.total)
    );

    /*********************************************************
     STEP 10b: Rejected – sum is_rejected across crosscut, flitch, peeling
    *********************************************************/
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
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$crosscut_cmt' },
        },
      },
    ]);
    rejectedCrosscutAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total)
    );

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
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$flitch_cmt' },
        },
      },
    ]);
    rejectedFlitchAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total)
    );

    const rejectedPeelingAgg = await peeling_done_other_details_model.aggregate([
      {
        $match: { createdAt: { $gte: start, $lte: end }, is_rejected: true },
      },
      {
        $lookup: {
          from: 'peeling_done_items',
          localField: '_id',
          foreignField: 'peeling_done_other_details_id',
          as: 'items',
        },
      },
      { $unwind: '$items' },
      ...(filter.item_name
        ? [{ $match: { 'items.item_name': filter.item_name } }]
        : []),
      {
        $group: {
          _id: {
            item_id: '$items.item_name_id',
            item_name: '$items.item_name',
          },
          total: { $sum: '$items.cmt' },
        },
      },
    ]);
    rejectedPeelingAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total)
    );

    // closing stock agg: logs with invoice inward_date in range and status != null
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
      {
        $match: {
          'invoice.inward_date': { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { item_id: '$item_id', item_name: '$item_name' },
          total: { $sum: '$physical_cmt' },
        },
      },
    ]);

    const closingMap = new Map();
    closingAgg.forEach((r) =>
      closingMap.set(`${r._id.item_id}_${r._id.item_name}`, r.total)
    );

    /*********************************************************
     STEP 11: Build Final Report
     simple opening/closing formula per user request
    *********************************************************/
    const report = Array.from(reportMap.values()).map((r) => {
      const key = `${r.item_id}_${r.item_name}`;
      const opening_stock_cmt = r.opening_stock || 0; // from earlier agg
      const closing_stock_cmt =
        (closingMap.get(key) || 0) - opening_stock_cmt;

      return {
        item_id: r.item_id,
        item_name: r.item_name,
        opening_stock_cmt,
        invoice_cmt: r.invoice_cmt,
        indian_cmt: r.indian_cmt,
        actual_cmt: r.actual_cmt,
        recover_from_rejected: r.recover_from_rejected,
        issue_for_cc: r.issue_for_cc,
        cc_received: r.cc_received,
        cc_issued: r.cc_issued,
        cc_diff: r.issue_for_cc - r.cc_received,
        issue_for_flitch: r.flitch_issued,
        flitch_received: r.flitch_received,
        flitch_diff: r.flitch_issued - r.flitch_received,
        issue_for_sqedge: r.issue_for_sqedge,
        peeling_issued: r.peeling_issued,
        peeling_received: r.peeling_received,
        peeling_diff: r.peeling_issued - r.peeling_received,
        sales: r.sales,
        job_work_challan: r.job_work_challan,
        rejected: r.rejected,
        closing_stock_cmt,
      };
    });

    console.log('Final Report Data:', report);
    // each object now contains opening_stock_cmt, invoice_cmt, indian_cmt, actual_cmt, sales, rejected, closing_stock_cmt, etc.

    if (!report.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, "No stock data found for the selected period"));
    }

    /*********************************************************
     STEP 12: Generate Excel
    *********************************************************/
    const excelLink = await createItemWiseInwardReportExcel(
      report,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        "Item wise inward report generated successfully",
        excelLink
      )
    );
  } catch (error) {
    console.error("Error generating inventory report:", error);
    return next(new ApiError(error.message || "Failed to generate report", 500));
  }
});