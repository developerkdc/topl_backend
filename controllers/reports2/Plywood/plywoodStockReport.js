import {
  plywood_inventory_items_details,
  plywood_inventory_items_view_modal,
} from '../../../database/schema/inventory/Plywood/plywood.schema.js';
import plywood_history_model from '../../../database/schema/inventory/Plywood/plywood.history.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  GeneratePlywoodStockReportExcel,
  GeneratePlywoodItemWiseStockReportExcel,
  GeneratePlywoodStockReportByPelletExcel,
} from '../../../config/downloadExcel/reports2/Plywood/plywoodStockReport.js';

/** Round stock value; treat floating-point noise (|v| < 1e-10) as 0 */
const roundStock = (v, decimals = 4) => {
  const rounded = Math.round(v * 10 ** decimals) / 10 ** decimals;
  return Math.abs(rounded) < 1e-10 ? 0 : rounded;
};

/**
 * Plywood Stock Report – Excel download.
 * Uses startDate, endDate and optional filter (item_sub_category_name).
 * Returns opening, receive, consume, sales, issue for ply resizing, issue for pressing, closing (sheets + sqm).
 *
 * @route POST /report/download-stock-report-plywood
 * @access Private
 */
export const plywoodStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate, includeCostAndExpense } = req.body;
  const filter = req.body?.filter || {};

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  const itemFilter = {};
  if (filter.item_sub_category_name) {
    itemFilter.item_sub_category_name = filter.item_sub_category_name;
  }

  try {
    const currentInventory = await plywood_inventory_items_view_modal.aggregate([
      {
        $match: {
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: {
            item_sub_category_name: '$item_sub_category_name',
            thickness: '$thickness',
            length: '$length',
            width: '$width',
          },
          total_amount: { $sum: '$amount' },
          total_expense_amount: { $sum: '$expense_amount' },
          current_sheets: { $sum: '$available_sheets' },
          current_sqm: { $sum: '$available_sqm' },
          item_ids: { $push: '$_id' },
        },
      },
    ]);

    const stockData = await Promise.all(
      currentInventory.map(async (item) => {
        const { item_sub_category_name, thickness, length, width } = item._id;
        const itemIds = item.item_ids;

        const receives = await plywood_inventory_items_details.aggregate([
          {
            $match: {
              item_sub_category_name,
              thickness,
              length,
              width,
              deleted_at: null,
            },
          },
          {
            $lookup: {
              from: 'plywood_inventory_invoice_details',
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
              _id: null,
              total_sheets: { $sum: '$sheets' },
              total_sqm: { $sum: '$total_sq_meter' },
              total_amount: { $sum: '$amount' },
              total_expense_amount: { $sum: '$expense_amount' },
            },
          },
        ]);

        const [challan, order, issuePlyResizing, issuePressing] = await Promise.all([
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'order',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'plywood_resizing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
        ]);

        const receiveSheets = receives[0]?.total_sheets || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const challanSheets = challan[0]?.total_sheets || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderSheets = order[0]?.total_sheets || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePlyResizingSheets = issuePlyResizing[0]?.total_sheets || 0;
        const issuePlyResizingSqm = issuePlyResizing[0]?.total_sqm || 0;
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeSheets = challanSheets + orderSheets + issuePlyResizingSheets + issuePressingSheets;
        const consumeSqm = challanSqm + orderSqm + issuePlyResizingSqm + issuePressingSqm;
        const currentSheets = item.current_sheets || 0;
        const currentSqm = item.current_sqm || 0;
        const openingSheets = currentSheets + consumeSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;
        const openingAmount = item.total_amount || 0;
        const openingExpenseAmount = item.total_expense_amount || 0;
        const receiveAmount = receives[0]?.total_amount || 0;
        const receiveExpenseAmount = receives[0]?.total_expense_amount || 0;
        const challanAmount = challan[0]?.total_amount || 0;
        const orderAmount = order[0]?.total_amount || 0;
        const issuePlyResizingAmount = issuePlyResizing[0]?.total_amount || 0;
        const issuePressingAmount = issuePressing[0]?.total_amount || 0;
        const consumeAmount = challanAmount + orderAmount + issuePlyResizingAmount + issuePressingAmount;
        const consumeExpenseAmount = 0;
        const closingAmount = openingAmount + receiveAmount - consumeAmount;
        const closingExpenseAmount = openingExpenseAmount + receiveExpenseAmount - consumeExpenseAmount;

        return {
          plywood_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_sheets: Math.max(0, roundStock(openingSheets, 0)),
          opening_sqm: Math.max(0, roundStock(openingSqm)),
          receive_sheets: receiveSheets,
          receive_sqm: receiveSqm,
          consume_sheets: consumeSheets,
          consume_sqm: consumeSqm,
          challan_sheets: challanSheets,
          challan_sqm: challanSqm,
          order_sheets: orderSheets,
          order_sqm: orderSqm,
          issue_for_ply_resizing_sheets: issuePlyResizingSheets,
          issue_for_ply_resizing_sqm: issuePlyResizingSqm,
          issue_for_pressing_sheets: issuePressingSheets,
          issue_for_pressing_sqm: issuePressingSqm,
          closing_sheets: Math.max(0, roundStock(closingSheets, 0)),
          closing_sqm: Math.max(0, roundStock(closingSqm)),
          opening_amount: Math.max(0, roundStock(openingAmount)),
          opening_expense_amount: Math.max(0, roundStock(openingExpenseAmount)),
          receive_amount: Math.max(0, roundStock(receiveAmount)),
          receive_expense_amount: Math.max(0, roundStock(receiveExpenseAmount)),
          consume_amount: Math.max(0, roundStock(consumeAmount)),
          consume_expense_amount: Math.max(0, roundStock(consumeExpenseAmount)),
          challan_amount: Math.max(0, roundStock(challanAmount)),
          order_amount: Math.max(0, roundStock(orderAmount)),
          issue_for_ply_resizing_amount: Math.max(0, roundStock(issuePlyResizingAmount)),
          issue_for_pressing_amount: Math.max(0, roundStock(issuePressingAmount)),
          closing_amount: Math.max(0, roundStock(closingAmount)),
          closing_expense_amount: Math.max(0, roundStock(closingExpenseAmount)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, ply resizing, or pressing).
    const activeStockData = stockData.filter(
      (item) =>
        item.receive_sheets > 0 ||
        item.consume_sheets > 0 ||
        item.challan_sheets > 0 ||
        item.order_sheets > 0 ||
        item.issue_for_ply_resizing_sheets > 0 ||
        item.issue_for_pressing_sheets > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    const excelLink = await GeneratePlywoodStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter,
      includeCostAndExpense
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});

/**
 * Plywood Stock Report – Item-wise. Same columns as stock report, grouped by item_name then thickness.
 * @route POST /report/download-stock-report-plywood-item-wise
 */
export const plywoodItemWiseStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate, includeCostAndExpense } = req.body;
  const filter = req.body?.filter || {};

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  const itemFilter = {};
  if (filter.item_sub_category_name) {
    itemFilter.item_sub_category_name = filter.item_sub_category_name;
  }
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    const currentInventory = await plywood_inventory_items_view_modal.aggregate([
      { $match: { deleted_at: null, ...itemFilter } },
      {
        $group: {
          _id: {
            item_name: '$item_name',
            item_sub_category_name: '$item_sub_category_name',
            thickness: '$thickness',
            length: '$length',
            width: '$width',
          },
          total_amount: { $sum: '$amount' },
          total_expense_amount: { $sum: '$expense_amount' },
          current_sheets: { $sum: '$available_sheets' },
          current_sqm: { $sum: '$available_sqm' },
          item_ids: { $push: '$_id' },
        },
      },
    ]);

    const stockData = await Promise.all(
      currentInventory.map(async (item) => {
        const { item_name, item_sub_category_name, thickness, length, width } = item._id;
        const itemIds = item.item_ids;

        const receives = await plywood_inventory_items_details.aggregate([
          {
            $match: {
              item_name,
              item_sub_category_name,
              thickness,
              length,
              width,
              deleted_at: null,
            },
          },
          {
            $lookup: {
              from: 'plywood_inventory_invoice_details',
              localField: 'invoice_id',
              foreignField: '_id',
              as: 'invoice',
            },
          },
          { $unwind: '$invoice' },
          { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
          {
            $group: {
              _id: null,
              total_sheets: { $sum: '$sheets' },
              total_sqm: { $sum: '$total_sq_meter' },
              total_amount: { $sum: '$amount' },
              total_expense_amount: { $sum: '$expense_amount' },
            },
          },
        ]);

        const [challan, order, issuePlyResizing, issuePressing] = await Promise.all([
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
                total_expense_amount: { $sum: '$issued_expense_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'order',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
                total_expense_amount: { $sum: '$issued_expense_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'plywood_resizing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
                total_expense_amount: { $sum: '$issued_expense_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: { $in: itemIds },
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
                total_expense_amount: { $sum: '$issued_expense_amount' },
              },
            },
          ]),
        ]);

        const receiveSheets = receives[0]?.total_sheets || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const challanSheets = challan[0]?.total_sheets || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderSheets = order[0]?.total_sheets || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePlyResizingSheets = issuePlyResizing[0]?.total_sheets || 0;
        const issuePlyResizingSqm = issuePlyResizing[0]?.total_sqm || 0;
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeSheets = challanSheets + orderSheets + issuePlyResizingSheets + issuePressingSheets;
        const consumeSqm = challanSqm + orderSqm + issuePlyResizingSqm + issuePressingSqm;
        const currentSheets = item.current_sheets || 0;
        const currentSqm = item.current_sqm || 0;
        const openingSheets = currentSheets + consumeSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;
        const openingAmount = item.total_amount || 0;
        const openingExpenseAmount = item.total_expense_amount || 0;
        const receiveAmount = receives[0]?.total_amount || 0;
        const receiveExpenseAmount = receives[0]?.total_expense_amount || 0;
        const challanAmount = challan[0]?.total_amount || 0;
        const challanExpenseAmount = challan[0]?.total_expense_amount || 0;
        const orderAmount = order[0]?.total_amount || 0;
        const orderExpenseAmount = order[0]?.total_expense_amount || 0;
        const issuePlyResizingAmount = issuePlyResizing[0]?.total_amount || 0;
        const issuePlyResizingExpenseAmount = issuePlyResizing[0]?.total_expense_amount || 0;
        const issuePressingAmount = issuePressing[0]?.total_amount || 0;
        const issuePressingExpenseAmount = issuePressing[0]?.total_expense_amount || 0;
        const consumeAmount = challanAmount + orderAmount + issuePlyResizingAmount + issuePressingAmount;
        const consumeExpenseAmount = challanExpenseAmount + orderExpenseAmount + issuePlyResizingExpenseAmount + issuePressingExpenseAmount;
        const closingAmount = openingAmount + receiveAmount - consumeAmount;
        const closingExpenseAmount = openingExpenseAmount + receiveExpenseAmount - consumeExpenseAmount;

        return {
          item_name: item_name || '',
          plywood_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_sheets: Math.max(0, roundStock(openingSheets, 0)),
          opening_sqm: Math.max(0, roundStock(openingSqm)),
          receive_sheets: receiveSheets,
          receive_sqm: receiveSqm,
          consume_sheets: consumeSheets,
          consume_sqm: consumeSqm,
          challan_sheets: challanSheets,
          challan_sqm: challanSqm,
          order_sheets: orderSheets,
          order_sqm: orderSqm,
          issue_for_ply_resizing_sheets: issuePlyResizingSheets,
          issue_for_ply_resizing_sqm: issuePlyResizingSqm,
          issue_for_pressing_sheets: issuePressingSheets,
          issue_for_pressing_sqm: issuePressingSqm,
          closing_sheets: Math.max(0, roundStock(closingSheets, 0)),
          closing_sqm: Math.max(0, roundStock(closingSqm)),
          opening_amount: Math.max(0, roundStock(openingAmount, 2)),
          opening_expense_amount: Math.max(0, roundStock(openingExpenseAmount, 2)),
          receive_amount: receiveAmount,
          receive_expense_amount: receiveExpenseAmount,
          consume_amount: consumeAmount,
          consume_expense_amount: consumeExpenseAmount,
          challan_amount: challanAmount,
          challan_expense_amount: challanExpenseAmount,
          order_amount: orderAmount,
          order_expense_amount: orderExpenseAmount,
          issue_for_ply_resizing_amount: issuePlyResizingAmount,
          issue_for_ply_resizing_expense_amount: issuePlyResizingExpenseAmount,
          issue_for_pressing_amount: issuePressingAmount,
          issue_for_pressing_expense_amount: issuePressingExpenseAmount,
          closing_amount: Math.max(0, roundStock(closingAmount, 2)),
          closing_expense_amount: Math.max(0, roundStock(closingExpenseAmount, 2)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, ply resizing, or pressing).
    const activeStockData = stockData.filter(
      (row) =>
        row.receive_sheets > 0 ||
        row.consume_sheets > 0 ||
        row.challan_sheets > 0 ||
        row.order_sheets > 0 ||
        row.issue_for_ply_resizing_sheets > 0 ||
        row.issue_for_pressing_sheets > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    const excelLink = await GeneratePlywoodItemWiseStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter,
      includeCostAndExpense
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Item-wise stock report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating plywood item-wise stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});

/**
 * Plywood Stock Report – By Pellet No. Each row = one pellet (pallet_number).
 * Same columns as stock report with Pellet No. as first column; grouped by Plywood Sub Category.
 *
 * @route POST /report/download-stock-report-plywood-by-pellet
 * @access Private
 */
export const plywoodStockReportByPelletCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate, includeCostAndExpense } = req.body;
  const filter = req.body?.filter || {};

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  const itemFilter = {};
  if (filter.item_sub_category_name) {
    itemFilter.item_sub_category_name = filter.item_sub_category_name;
  }

  try {
    const allItems = await plywood_inventory_items_details.aggregate([
      { $match: { deleted_at: null, ...itemFilter } },
      {
        $lookup: {
          from: 'plywood_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'invoice',
        },
      },
      { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          pallet_number: 1,
          item_sub_category_name: 1,
          thickness: 1,
          length: 1,
          width: 1,
          sheets: 1,
          total_sq_meter: 1,
          available_sheets: 1,
          available_sqm: 1,
          inward_date: '$invoice.inward_date',
          amount: 1,
          expense_amount: 1,
        },
      },
    ]);

    const stockData = await Promise.all(
      allItems.map(async (item) => {
        const itemId = item._id;
        const inwardDate = item.inward_date;

        const receiveSheets =
          inwardDate && inwardDate >= start && inwardDate <= end ? (item.sheets || 0) : 0;
        const receiveSqm =
          inwardDate && inwardDate >= start && inwardDate <= end
            ? (item.total_sq_meter || 0)
            : 0;

        const [challan, order, issuePlyResizing, issuePressing] = await Promise.all([
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: itemId,
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: itemId,
                issue_status: 'order',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: itemId,
                issue_status: 'plywood_resizing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
          plywood_history_model.aggregate([
            {
              $match: {
                plywood_item_id: itemId,
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
                total_amount: { $sum: '$issued_amount' },
              },
            },
          ]),
        ]);

        const challanSheets = challan[0]?.total_sheets || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderSheets = order[0]?.total_sheets || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePlyResizingSheets = issuePlyResizing[0]?.total_sheets || 0;
        const issuePlyResizingSqm = issuePlyResizing[0]?.total_sqm || 0;
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeSheets = challanSheets + orderSheets + issuePlyResizingSheets + issuePressingSheets;
        const consumeSqm = challanSqm + orderSqm + issuePlyResizingSqm + issuePressingSqm;
        const currentSheets = item.available_sheets ?? item.sheets ?? 0;
        const currentSqm = item.available_sqm ?? item.total_sq_meter ?? 0;
        const openingSheets = currentSheets + consumeSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;
        const openingAmount = item.amount || 0;
        const openingExpenseAmount = item.expense_amount || 0;
        const receiveAmount =
          inwardDate && inwardDate >= start && inwardDate <= end ? (item.amount || 0) : 0;
        const receiveExpenseAmount =
          inwardDate && inwardDate >= start && inwardDate <= end ? (item.expense_amount || 0) : 0;
        const challanAmount = challan[0]?.total_amount || 0;
        const challanExpenseAmount = challan[0]?.total_expense_amount || 0;
        const orderAmount = order[0]?.total_amount || 0;
        const orderExpenseAmount = order[0]?.total_expense_amount || 0;
        const issuePlyResizingAmount = issuePlyResizing[0]?.total_amount || 0;
        const issuePlyResizingExpenseAmount = issuePlyResizing[0]?.total_expense_amount || 0;
        const issuePressingAmount = issuePressing[0]?.total_amount || 0;
        const issuePressingExpenseAmount = issuePressing[0]?.total_expense_amount || 0;
        const consumeAmount = challanAmount + orderAmount + issuePlyResizingAmount + issuePressingAmount;
        const consumeExpenseAmount = challanExpenseAmount + orderExpenseAmount + issuePlyResizingExpenseAmount + issuePressingExpenseAmount;
        const closingAmount = openingAmount + receiveAmount - consumeAmount;
        const closingExpenseAmount = openingExpenseAmount + receiveExpenseAmount - consumeExpenseAmount;

        return {
          pellet_no: item.pallet_number,
          plywood_sub_type: item.item_sub_category_name,
          thickness: item.thickness,
          size: `${item.length} X ${item.width}`,
          opening_sheets: Math.max(0, roundStock(openingSheets, 0)),
          opening_sqm: Math.max(0, roundStock(openingSqm)),
          receive_sheets: receiveSheets,
          receive_sqm: receiveSqm,
          consume_sheets: consumeSheets,
          consume_sqm: consumeSqm,
          challan_sheets: challanSheets,
          challan_sqm: challanSqm,
          order_sheets: orderSheets,
          order_sqm: orderSqm,
          issue_for_ply_resizing_sheets: issuePlyResizingSheets,
          issue_for_ply_resizing_sqm: issuePlyResizingSqm,
          issue_for_pressing_sheets: issuePressingSheets,
          issue_for_pressing_sqm: issuePressingSqm,
          closing_sheets: Math.max(0, roundStock(closingSheets, 0)),
          closing_sqm: Math.max(0, roundStock(closingSqm)),
          opening_amount: Math.max(0, roundStock(openingAmount, 2)),
          opening_expense_amount: Math.max(0, roundStock(openingExpenseAmount, 2)),
          receive_amount: receiveAmount,
          receive_expense_amount: receiveExpenseAmount,
          consume_amount: consumeAmount,
          consume_expense_amount: consumeExpenseAmount,
          challan_amount: challanAmount,
          challan_expense_amount: challanExpenseAmount,
          order_amount: orderAmount,
          order_expense_amount: orderExpenseAmount,
          issue_for_ply_resizing_amount: issuePlyResizingAmount,
          issue_for_ply_resizing_expense_amount: issuePlyResizingExpenseAmount,
          issue_for_pressing_amount: issuePressingAmount,
          issue_for_pressing_expense_amount: issuePressingExpenseAmount,
          closing_amount: Math.max(0, roundStock(closingAmount, 2)),
          closing_expense_amount: Math.max(0, roundStock(closingExpenseAmount, 2)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, ply resizing, or pressing).
    const activeStockData = stockData
      .filter(
        (item) =>
          item.receive_sheets > 0 ||
          item.consume_sheets > 0 ||
          item.challan_sheets > 0 ||
          item.order_sheets > 0 ||
          item.issue_for_ply_resizing_sheets > 0 ||
          item.issue_for_pressing_sheets > 0
      )
      .sort((a, b) => {
        const subCmp = (a.plywood_sub_type || '').localeCompare(b.plywood_sub_type || '');
        if (subCmp !== 0) return subCmp;
        return (a.pellet_no || 0) - (b.pellet_no || 0);
      });

    if (activeStockData.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    const excelLink = await GeneratePlywoodStockReportByPelletExcel(
      activeStockData,
      startDate,
      endDate,
      filter,
      includeCostAndExpense
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report by pellet generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating plywood stock report by pellet:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});
