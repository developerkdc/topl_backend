import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { issues_for_crosscutting_model } from '../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { issues_for_peeling_model } from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling.schema.js';
import { peeling_done_other_details_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { rejected_crosscutting_model } from '../../../database/schema/factory/crossCutting/rejectedCrosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import issues_for_peeling_wastage_model from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import { createItemWiseInwardReportExcel } from '../../../config/downloadExcel/reports2/Log/itemWiseInward.js';

/**
 * Item Wise Inward Daily Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * 
 * @route POST /api/V1/report/download-excel-item-wise-inward-daily-report
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
     STEP 3: Current Available CMT (closing balance) – for formula: Opening = Closing + Issued - Received
     Sum of: round logs (issue_status=null) + crosscut (issue_status=null) + flitch (issue_status=null)
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
     STEP 10: Peeling Received – from peeling_done_other_details.total_cmt
     Allocate total_cmt to items proportionally when a record has multiple items
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
          itemsSum: { $sum: "$items.cmt" },
        },
      },
      { $unwind: "$items" },

      ...(filter.item_name
        ? [{ $match: { "items.item_name": filter.item_name } }]
        : []),

      {
        $addFields: {
          itemShare: {
            $cond: [
              { $eq: ["$itemsSum", 0] },
              0,
              { $divide: ["$items.cmt", "$itemsSum"] },
            ],
          },
        },
      },
      {
        $addFields: {
          allocatedCmt: { $multiply: ["$total_cmt", "$itemShare"] },
        },
      },
      {
        $group: {
          _id: {
            item_id: "$items.item_name_id",
            item_name: "$items.item_name",
          },
          total: { $sum: "$allocatedCmt" },
        },
      },
    ]);

    peelingReceivedAgg.forEach((r) =>
      addValue(r._id.item_id, r._id.item_name, "peeling_received", r.total)
    );

    /*********************************************************
     STEP 10a: Sales (order only) and Job Work Challan (challan only)
    *********************************************************/
    const [logOrderAgg, logChallanAgg] = await Promise.all([
      log_inventory_items_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'order', ...itemFilter } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$physical_cmt' } } },
      ]),
      log_inventory_items_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'challan', ...itemFilter } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$physical_cmt' } } },
      ]),
    ]);
    logOrderAgg.forEach((r) => addValue(r._id.item_id, r._id.item_name, 'sales', r.total));
    logChallanAgg.forEach((r) => addValue(r._id.item_id, r._id.item_name, 'job_work_challan', r.total));

    const [crosscutOrderAgg, crosscutChallanAgg] = await Promise.all([
      crosscutting_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'order', ...itemFilter } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$crosscut_cmt' } } },
      ]),
      crosscutting_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, issue_status: 'challan', ...itemFilter } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$crosscut_cmt' } } },
      ]),
    ]);
    crosscutOrderAgg.forEach((r) => addValue(r._id.item_id, r._id.item_name, 'sales', r.total));
    crosscutChallanAgg.forEach((r) => addValue(r._id.item_id, r._id.item_name, 'job_work_challan', r.total));

    const [flitchOrderAgg, flitchChallanAgg] = await Promise.all([
      flitching_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, deleted_at: null, issue_status: 'order', ...itemFilter } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$flitch_cmt' } } },
      ]),
      flitching_done_model.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, deleted_at: null, issue_status: 'challan', ...itemFilter } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$flitch_cmt' } } },
      ]),
    ]);
    flitchOrderAgg.forEach((r) => addValue(r._id.item_id, r._id.item_name, 'sales', r.total));
    flitchChallanAgg.forEach((r) => addValue(r._id.item_id, r._id.item_name, 'job_work_challan', r.total));

    /*********************************************************
     STEP 10b: Rejected (Cc+Flitch+Peeling)
     CC: rejected crosscutting (rejected_crosscutting.rejected_quantity.physical_cmt)
     Flitch: wastage CMT (flitching_done.wastage_info.wastage_sqm * sqm_factor)
     Peeling: peeling wastage (issues_for_peeling_wastage.cmt)
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
        },
      },
    ]);
    rejectedCrosscutAgg.forEach((r) => {
      addValue(r._id.item_id, r._id.item_name, 'rejected', r.total);
      console.log('Rejected Stock [CC - Rejected Crosscutting]:', r._id.item_name, '=', r.total);
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
      console.log('Rejected Stock [Flitch - Wastage CMT]:', r._id.item_name, '=', r.total);
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
      console.log('Rejected Stock [Peeling - Peeling Wastage]:', r._id.item_name, '=', r.total);
    });

    /*********************************************************
     STEP 10c: Received/Issued AFTER period – to reconstruct period-end closing for past dates
     Period-end closing = stock at end of endDate. If endDate < today, we must reconstruct:
     Closing(period-end) = Current - Received(after) + Issued(after)
    *********************************************************/
    const now = new Date();
    const isCurrentPeriod = end >= now;

    let receivedAfterMap = new Map();
    let issuedAfterMap = new Map();

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
     Filter by date range: only include items that had inward_date in [start, end]
     Opening = stock at start of period (startDate). Closing = stock at end of period (endDate).
     Formula: Opening = Closing + Issued - Received
     For current period (endDate >= today): Closing = current available
     For past period: Closing = Current - Received(after) + Issued(after)
     Issued = issue_for_cc + flitch_issued + peeling_issued + sales + job_work_challan + rejected
     Received = actual_cmt (logs inward in period)
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
    const defaults = { issue_for_cc: 0, flitch_issued: 0, peeling_issued: 0, sales: 0, rejected: 0, actual_cmt: 0, invoice_cmt: 0, indian_cmt: 0, cc_received: 0, cc_issued: 0, flitch_received: 0, peeling_received: 0, recover_from_rejected: 0, issue_for_sqedge: 0, job_work_challan: 0 };
    const report = Array.from(mergedKeys).map((key) => {
      const r = reportMap.get(key) || { ...keyToItem.get(key), ...defaults };
      const currentAvailable = currentAvailableMap.get(key) || 0;
      const received = r.actual_cmt || 0;
      const issued =
        (r.issue_for_cc || 0) +
        (r.flitch_issued || 0) +
        (r.peeling_issued || 0) +
        (r.sales || 0) +
        (r.job_work_challan || 0) +
        (r.rejected || 0);

      const periodEndClosing = isCurrentPeriod
        ? currentAvailable
        : Math.max(0, currentAvailable - (receivedAfterMap.get(key) || 0) + (issuedAfterMap.get(key) || 0));
      const opening_stock_cmt = Math.max(0, periodEndClosing + issued - received);
      const closing_stock_cmt = opening_stock_cmt + received - issued;

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