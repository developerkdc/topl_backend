import {
  mdf_inventory_items_details,
  mdf_inventory_items_view_modal,
} from '../../../database/schema/inventory/mdf/mdf.schema.js';
import mdf_history_model from '../../../database/schema/inventory/mdf/mdf.history.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  GenerateMdfStockReportExcel,
  GenerateMdfItemWiseStockReportExcel,
  GenerateMdfStockReportByPelletExcel,
} from '../../../config/downloadExcel/reports2/MDF/mdfStockReport.js';

/** Round stock value; treat floating-point noise (|v| < 1e-10) as 0 */
const roundStock = (v, decimals = 4) => {
  const rounded = Math.round(v * 10 ** decimals) / 10 ** decimals;
  return Math.abs(rounded) < 1e-10 ? 0 : rounded;
};

/** MDF report metre/SQM precision is fixed to 2 decimals. */
const roundMetricValue = (v) => roundStock(v, 2);

/**
 * MDF Stock Report – Excel download.
 * Uses startDate, endDate and optional filter (item_sub_category_name).
 * Returns opening, receive, consume, challan, order, issue for pressing, closing (sheets + sqm).
 *
 * @route POST /report/download-stock-report-mdf
 * @access Private
 */
export const mdfStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.body;
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
    const currentInventory = await mdf_inventory_items_view_modal.aggregate([
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

        const receives = await mdf_inventory_items_details.aggregate([
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
              from: 'mdf_inventory_invoice_details',
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
              total_sheets: { $sum: '$no_of_sheet' },
              total_sqm: { $sum: '$total_sq_meter' },
            },
          },
        ]);

        const [challan, order, issuePressing] = await Promise.all([
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: { $in: itemIds },
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: { $in: itemIds },
                issue_status: 'order',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: { $in: itemIds },
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
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
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeSheets = challanSheets + orderSheets + issuePressingSheets;
        const consumeSqm = challanSqm + orderSqm + issuePressingSqm;
        const currentSheets = item.current_sheets || 0;
        const currentSqm = item.current_sqm || 0;

        const openingSheets = currentSheets + consumeSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;

        return {
          mdf_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_sheets: Math.max(0, roundStock(openingSheets, 0)),
          opening_sqm: Math.max(0, roundMetricValue(openingSqm)),
          receive_sheets: receiveSheets,
          receive_sqm: roundMetricValue(receiveSqm),
          consume_sheets: consumeSheets,
          consume_sqm: roundMetricValue(consumeSqm),
          challan_sheets: challanSheets,
          challan_sqm: roundMetricValue(challanSqm),
          order_sheets: orderSheets,
          order_sqm: roundMetricValue(orderSqm),
          issue_pressing_sheets: issuePressingSheets,
          issue_pressing_sqm: roundMetricValue(issuePressingSqm),
          closing_sheets: Math.max(0, roundStock(closingSheets, 0)),
          closing_sqm: Math.max(0, roundMetricValue(closingSqm)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing).
    const activeStockData = stockData.filter(
      (item) =>
        item.receive_sheets > 0 ||
        item.consume_sheets > 0 ||
        item.challan_sheets > 0 ||
        item.order_sheets > 0 ||
        item.issue_pressing_sheets > 0
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

    const excelLink = await GenerateMdfStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating MDF stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});

/**
 * MDF Stock Report – Item-wise. Same columns as stock report, grouped by item_name then thickness.
 * @route POST /report/download-stock-report-mdf-item-wise
 */
export const mdfItemWiseStockReportCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.body;
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
    const currentInventory = await mdf_inventory_items_view_modal.aggregate([
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

        const receives = await mdf_inventory_items_details.aggregate([
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
              from: 'mdf_inventory_invoice_details',
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
              total_sheets: { $sum: '$no_of_sheet' },
              total_sqm: { $sum: '$total_sq_meter' },
            },
          },
        ]);

        const [challan, order, issuePressing] = await Promise.all([
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: { $in: itemIds },
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: { $in: itemIds },
                issue_status: 'order',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: { $in: itemIds },
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
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
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeSheets = challanSheets + orderSheets + issuePressingSheets;
        const consumeSqm = challanSqm + orderSqm + issuePressingSqm;
        const currentSheets = item.current_sheets || 0;
        const currentSqm = item.current_sqm || 0;

        const openingSheets = currentSheets + consumeSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;

        return {
          item_name: item_name || '',
          mdf_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_sheets: Math.max(0, roundStock(openingSheets, 0)),
          opening_sqm: Math.max(0, roundMetricValue(openingSqm)),
          receive_sheets: receiveSheets,
          receive_sqm: roundMetricValue(receiveSqm),
          consume_sheets: consumeSheets,
          consume_sqm: roundMetricValue(consumeSqm),
          challan_sheets: challanSheets,
          challan_sqm: roundMetricValue(challanSqm),
          order_sheets: orderSheets,
          order_sqm: roundMetricValue(orderSqm),
          issue_pressing_sheets: issuePressingSheets,
          issue_pressing_sqm: roundMetricValue(issuePressingSqm),
          closing_sheets: Math.max(0, roundStock(closingSheets, 0)),
          closing_sqm: Math.max(0, roundMetricValue(closingSqm)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing).
    const activeStockData = stockData.filter(
      (row) =>
        row.receive_sheets > 0 ||
        row.consume_sheets > 0 ||
        row.challan_sheets > 0 ||
        row.order_sheets > 0 ||
        row.issue_pressing_sheets > 0
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

    const excelLink = await GenerateMdfItemWiseStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Item-wise stock report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating MDF item-wise stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});

/**
 * MDF Stock Report – By Pellet No. Each row = one pellet (pallet_number).
 * Same columns as stock report with Pellet No. as first column; grouped by MDF Sub Category.
 *
 * @route POST /report/download-stock-report-mdf-by-pellet
 * @access Private
 */
export const mdfStockReportByPelletCsv = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.body;
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
    const allItems = await mdf_inventory_items_details.aggregate([
      { $match: { deleted_at: null, ...itemFilter } },
      {
        $lookup: {
          from: 'mdf_inventory_invoice_details',
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
          no_of_sheet: 1,
          total_sq_meter: 1,
          available_sheets: 1,
          available_sqm: 1,
          inward_date: '$invoice.inward_date',
        },
      },
    ]);

    const stockData = await Promise.all(
      allItems.map(async (item) => {
        const itemId = item._id;
        const inwardDate = item.inward_date;

        const receiveSheets =
          inwardDate && inwardDate >= start && inwardDate <= end ? (item.no_of_sheet || 0) : 0;
        const receiveSqm =
          inwardDate && inwardDate >= start && inwardDate <= end
            ? (item.total_sq_meter || 0)
            : 0;

        const [challan, order, issuePressing] = await Promise.all([
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: itemId,
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: itemId,
                issue_status: 'order',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          mdf_history_model.aggregate([
            {
              $match: {
                mdf_item_id: itemId,
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_sheets: { $sum: '$issued_sheets' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
        ]);

        const challanSheets = challan[0]?.total_sheets || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderSheets = order[0]?.total_sheets || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeSheets = challanSheets + orderSheets + issuePressingSheets;
        const consumeSqm = challanSqm + orderSqm + issuePressingSqm;
        const currentSheets = item.available_sheets ?? item.no_of_sheet ?? 0;
        const currentSqm = item.available_sqm ?? item.total_sq_meter ?? 0;

        const openingSheets = currentSheets + consumeSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;

        return {
          pellet_no: item.pallet_number,
          mdf_sub_type: item.item_sub_category_name,
          thickness: item.thickness,
          size: `${item.length} X ${item.width}`,
          opening_sheets: Math.max(0, roundStock(openingSheets, 0)),
          opening_sqm: Math.max(0, roundMetricValue(openingSqm)),
          receive_sheets: receiveSheets,
          receive_sqm: roundMetricValue(receiveSqm),
          consume_sheets: consumeSheets,
          consume_sqm: roundMetricValue(consumeSqm),
          challan_sheets: challanSheets,
          challan_sqm: roundMetricValue(challanSqm),
          order_sheets: orderSheets,
          order_sqm: roundMetricValue(orderSqm),
          issue_pressing_sheets: issuePressingSheets,
          issue_pressing_sqm: roundMetricValue(issuePressingSqm),
          closing_sheets: Math.max(0, roundStock(closingSheets, 0)),
          closing_sqm: Math.max(0, roundMetricValue(closingSqm)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing).
    const activeStockData = stockData
      .filter(
        (item) =>
          item.receive_sheets > 0 ||
          item.consume_sheets > 0 ||
          item.challan_sheets > 0 ||
          item.order_sheets > 0 ||
          item.issue_pressing_sheets > 0
      )
      .sort((a, b) => {
        const subCmp = (a.mdf_sub_type || '').localeCompare(b.mdf_sub_type || '');
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

    const excelLink = await GenerateMdfStockReportByPelletExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report by pellet generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating MDF stock report by pellet:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});
