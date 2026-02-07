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
} from '../../../config/downloadExcel/reports2/MDF/mdfStockReport.js';

/**
 * MDF Stock Report – Excel download.
 * Uses startDate, endDate and optional filter (item_sub_category_name).
 * Returns opening, receive, consume, sales, issue for pressing, closing (sheets + sqm).
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

        const consumption = await mdf_history_model.aggregate([
          {
            $match: {
              mdf_item_id: { $in: itemIds },
              issue_status: { $in: ['order', 'pressing'] },
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
        ]);

        const sales = await mdf_history_model.aggregate([
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
        ]);

        const issuePressing = await mdf_history_model.aggregate([
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
        ]);

        const receiveSheets = receives[0]?.total_sheets || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const consumeSheets = consumption[0]?.total_sheets || 0;
        const consumeSqm = consumption[0]?.total_sqm || 0;
        const salesSheets = sales[0]?.total_sheets || 0;
        const salesSqm = sales[0]?.total_sqm || 0;
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const currentSheets = item.current_sheets || 0;
        const currentSqm = item.current_sqm || 0;

        const openingSheets = currentSheets + consumeSheets + salesSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm + salesSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets - salesSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm - salesSqm;

        return {
          mdf_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_sheets: Math.max(0, openingSheets),
          opening_sqm: Math.max(0, openingSqm),
          receive_sheets: receiveSheets,
          receive_sqm: receiveSqm,
          consume_sheets: consumeSheets,
          consume_sqm: consumeSqm,
          sales_sheets: salesSheets,
          sales_sqm: salesSqm,
          issue_pressing_sheets: issuePressingSheets,
          issue_pressing_sqm: issuePressingSqm,
          closing_sheets: Math.max(0, closingSheets),
          closing_sqm: Math.max(0, closingSqm),
        };
      })
    );

    const activeStockData = stockData.filter(
      (item) =>
        item.opening_sheets > 0 ||
        item.receive_sheets > 0 ||
        item.consume_sheets > 0 ||
        item.sales_sheets > 0 ||
        item.closing_sheets > 0
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

        const consumption = await mdf_history_model.aggregate([
          {
            $match: {
              mdf_item_id: { $in: itemIds },
              issue_status: { $in: ['order', 'pressing'] },
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
        ]);

        const sales = await mdf_history_model.aggregate([
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
        ]);

        const issuePressing = await mdf_history_model.aggregate([
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
        ]);

        const receiveSheets = receives[0]?.total_sheets || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const consumeSheets = consumption[0]?.total_sheets || 0;
        const consumeSqm = consumption[0]?.total_sqm || 0;
        const salesSheets = sales[0]?.total_sheets || 0;
        const salesSqm = sales[0]?.total_sqm || 0;
        const issuePressingSheets = issuePressing[0]?.total_sheets || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const currentSheets = item.current_sheets || 0;
        const currentSqm = item.current_sqm || 0;

        const openingSheets = currentSheets + consumeSheets + salesSheets - receiveSheets;
        const openingSqm = currentSqm + consumeSqm + salesSqm - receiveSqm;
        const closingSheets = openingSheets + receiveSheets - consumeSheets - salesSheets;
        const closingSqm = openingSqm + receiveSqm - consumeSqm - salesSqm;

        return {
          item_name: item_name || '',
          mdf_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_sheets: Math.max(0, openingSheets),
          opening_sqm: Math.max(0, openingSqm),
          receive_sheets: receiveSheets,
          receive_sqm: receiveSqm,
          consume_sheets: consumeSheets,
          consume_sqm: consumeSqm,
          sales_sheets: salesSheets,
          sales_sqm: salesSqm,
          issue_pressing_sheets: issuePressingSheets,
          issue_pressing_sqm: issuePressingSqm,
          closing_sheets: Math.max(0, closingSheets),
          closing_sqm: Math.max(0, closingSqm),
        };
      })
    );

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_sheets > 0 ||
        row.receive_sheets > 0 ||
        row.consume_sheets > 0 ||
        row.sales_sheets > 0 ||
        row.closing_sheets > 0
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
