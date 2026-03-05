import {
  fleece_inventory_items_modal,
  fleece_inventory_items_view_modal,
} from '../../../database/schema/inventory/fleece/fleece.schema.js';
import fleece_history_model from '../../../database/schema/inventory/fleece/fleece.history.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  GenerateFleeceStockReportExcel,
  GenerateFleeceItemWiseStockReportExcel,
  GenerateFleeceStockReportByRollExcel,
} from '../../../config/downloadExcel/reports2/Fleece/fleeceStockReport.js';

/**
 * Fleece Stock Report – Excel download.
 * Uses startDate, endDate and optional filter (item_sub_category_name).
 * Returns opening, receive, consume, sales, issue for pressing, closing (rolls + sqm).
 *
 * @route POST /report/download-stock-report-fleece
 * @access Private
 */
export const fleeceStockReportCsv = catchAsync(async (req, res, next) => {
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
    const currentInventory = await fleece_inventory_items_view_modal.aggregate([
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
          current_rolls: { $sum: '$available_number_of_roll' },
          current_sqm: { $sum: '$available_sqm' },
          item_ids: { $push: '$_id' },
        },
      },
    ]);

    const stockData = await Promise.all(
      currentInventory.map(async (item) => {
        const { item_sub_category_name, thickness, length, width } = item._id;
        const itemIds = item.item_ids;

        const receives = await fleece_inventory_items_modal.aggregate([
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
              from: 'fleece_inventory_invoice_details',
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
              total_rolls: { $sum: '$number_of_roll' },
              total_sqm: { $sum: '$total_sq_meter' },
            },
          },
        ]);

        const consumption = await fleece_history_model.aggregate([
          {
            $match: {
              fleece_item_id: { $in: itemIds },
              issue_status: { $in: ['order', 'pressing'] },
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_rolls: { $sum: '$issued_number_of_roll' },
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const sales = await fleece_history_model.aggregate([
          {
            $match: {
              fleece_item_id: { $in: itemIds },
              issue_status: 'challan',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_rolls: { $sum: '$issued_number_of_roll' },
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const issuePressing = await fleece_history_model.aggregate([
          {
            $match: {
              fleece_item_id: { $in: itemIds },
              issue_status: 'pressing',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_rolls: { $sum: '$issued_number_of_roll' },
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const receiveRolls = receives[0]?.total_rolls || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const consumeRolls = consumption[0]?.total_rolls || 0;
        const consumeSqm = consumption[0]?.total_sqm || 0;
        const salesRolls = sales[0]?.total_rolls || 0;
        const salesSqm = sales[0]?.total_sqm || 0;
        const issuePressingRolls = issuePressing[0]?.total_rolls || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const currentRolls = item.current_rolls || 0;
        const currentSqm = item.current_sqm || 0;

        const openingRolls = currentRolls + consumeRolls + salesRolls - receiveRolls;
        const openingSqm = currentSqm + consumeSqm + salesSqm - receiveSqm;
        const closingRolls = openingRolls + receiveRolls - consumeRolls - salesRolls;
        const closingSqm = openingSqm + receiveSqm - consumeSqm - salesSqm;

        return {
          fleece_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_rolls: Math.max(0, openingRolls),
          opening_sqm: Math.max(0, openingSqm),
          receive_rolls: receiveRolls,
          receive_sqm: receiveSqm,
          consume_rolls: consumeRolls,
          consume_sqm: consumeSqm,
          sales_rolls: salesRolls,
          sales_sqm: salesSqm,
          issue_pressing_rolls: issuePressingRolls,
          issue_pressing_sqm: issuePressingSqm,
          closing_rolls: Math.max(0, closingRolls),
          closing_sqm: Math.max(0, closingSqm),
        };
      })
    );

    const activeStockData = stockData.filter(
      (item) =>
        item.opening_rolls > 0 ||
        item.receive_rolls > 0 ||
        item.consume_rolls > 0 ||
        item.sales_rolls > 0 ||
        item.closing_rolls > 0
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

    const excelLink = await GenerateFleeceStockReportExcel(
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
    console.error('Error generating fleece stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});

/**
 * Fleece Stock Report – Item-wise. Same columns as stock report, grouped by item_name then thickness.
 * @route POST /report/download-stock-report-fleece-item-wise
 */
export const fleeceItemWiseStockReportCsv = catchAsync(async (req, res, next) => {
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
    const currentInventory = await fleece_inventory_items_view_modal.aggregate([
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
          current_rolls: { $sum: '$available_number_of_roll' },
          current_sqm: { $sum: '$available_sqm' },
          item_ids: { $push: '$_id' },
        },
      },
    ]);

    const stockData = await Promise.all(
      currentInventory.map(async (item) => {
        const { item_name, item_sub_category_name, thickness, length, width } = item._id;
        const itemIds = item.item_ids;

        const receives = await fleece_inventory_items_modal.aggregate([
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
              from: 'fleece_inventory_invoice_details',
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
              total_rolls: { $sum: '$number_of_roll' },
              total_sqm: { $sum: '$total_sq_meter' },
            },
          },
        ]);

        const consumption = await fleece_history_model.aggregate([
          {
            $match: {
              fleece_item_id: { $in: itemIds },
              issue_status: { $in: ['order', 'pressing'] },
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_rolls: { $sum: '$issued_number_of_roll' },
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const sales = await fleece_history_model.aggregate([
          {
            $match: {
              fleece_item_id: { $in: itemIds },
              issue_status: 'challan',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_rolls: { $sum: '$issued_number_of_roll' },
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const issuePressing = await fleece_history_model.aggregate([
          {
            $match: {
              fleece_item_id: { $in: itemIds },
              issue_status: 'pressing',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_rolls: { $sum: '$issued_number_of_roll' },
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const receiveRolls = receives[0]?.total_rolls || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const consumeRolls = consumption[0]?.total_rolls || 0;
        const consumeSqm = consumption[0]?.total_sqm || 0;
        const salesRolls = sales[0]?.total_rolls || 0;
        const salesSqm = sales[0]?.total_sqm || 0;
        const issuePressingRolls = issuePressing[0]?.total_rolls || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const currentRolls = item.current_rolls || 0;
        const currentSqm = item.current_sqm || 0;

        const openingRolls = currentRolls + consumeRolls + salesRolls - receiveRolls;
        const openingSqm = currentSqm + consumeSqm + salesSqm - receiveSqm;
        const closingRolls = openingRolls + receiveRolls - consumeRolls - salesRolls;
        const closingSqm = openingSqm + receiveSqm - consumeSqm - salesSqm;

        return {
          item_name: item_name || '',
          fleece_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_rolls: Math.max(0, openingRolls),
          opening_sqm: Math.max(0, openingSqm),
          receive_rolls: receiveRolls,
          receive_sqm: receiveSqm,
          consume_rolls: consumeRolls,
          consume_sqm: consumeSqm,
          sales_rolls: salesRolls,
          sales_sqm: salesSqm,
          issue_pressing_rolls: issuePressingRolls,
          issue_pressing_sqm: issuePressingSqm,
          closing_rolls: Math.max(0, closingRolls),
          closing_sqm: Math.max(0, closingSqm),
        };
      })
    );

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_rolls > 0 ||
        row.receive_rolls > 0 ||
        row.consume_rolls > 0 ||
        row.sales_rolls > 0 ||
        row.closing_rolls > 0
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

    const excelLink = await GenerateFleeceItemWiseStockReportExcel(
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
    console.error('Error generating fleece item-wise stock report:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});

/**
 * Fleece Stock Report – By Roll No. Each row = one roll (item_sr_no).
 * Same columns as stock report with Roll No. as first column; grouped by Fleece Paper Sub Category.
 *
 * @route POST /report/download-stock-report-fleece-by-roll
 * @access Private
 */
export const fleeceStockReportByRollCsv = catchAsync(async (req, res, next) => {
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
    const allItems = await fleece_inventory_items_modal.aggregate([
      { $match: { deleted_at: null, ...itemFilter } },
      {
        $lookup: {
          from: 'fleece_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'invoice',
        },
      },
      { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          item_sr_no: 1,
          item_sub_category_name: 1,
          thickness: 1,
          length: 1,
          width: 1,
          number_of_roll: 1,
          total_sq_meter: 1,
          available_number_of_roll: 1,
          available_sqm: 1,
          inward_date: '$invoice.inward_date',
        },
      },
    ]);

    const stockData = await Promise.all(
      allItems.map(async (item) => {
        const itemId = item._id;
        const inwardDate = item.inward_date;

        const receiveRolls =
          inwardDate && inwardDate >= start && inwardDate <= end ? (item.number_of_roll || 0) : 0;
        const receiveSqm =
          inwardDate && inwardDate >= start && inwardDate <= end
            ? (item.total_sq_meter || 0)
            : 0;

        const [consumption, sales, issuePressing] = await Promise.all([
          fleece_history_model.aggregate([
            {
              $match: {
                fleece_item_id: itemId,
                issue_status: { $in: ['order', 'pressing'] },
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_rolls: { $sum: '$issued_number_of_roll' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          fleece_history_model.aggregate([
            {
              $match: {
                fleece_item_id: itemId,
                issue_status: 'challan',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_rolls: { $sum: '$issued_number_of_roll' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
          fleece_history_model.aggregate([
            {
              $match: {
                fleece_item_id: itemId,
                issue_status: 'pressing',
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: null,
                total_rolls: { $sum: '$issued_number_of_roll' },
                total_sqm: { $sum: '$issued_sqm' },
              },
            },
          ]),
        ]);

        const consumeRolls = consumption[0]?.total_rolls || 0;
        const consumeSqm = consumption[0]?.total_sqm || 0;
        const salesRolls = sales[0]?.total_rolls || 0;
        const salesSqm = sales[0]?.total_sqm || 0;
        const issuePressingRolls = issuePressing[0]?.total_rolls || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const currentRolls = item.available_number_of_roll ?? item.number_of_roll ?? 0;
        const currentSqm = item.available_sqm ?? item.total_sq_meter ?? 0;

        const openingRolls = currentRolls + consumeRolls + salesRolls - receiveRolls;
        const openingSqm = currentSqm + consumeSqm + salesSqm - receiveSqm;
        const closingRolls = openingRolls + receiveRolls - consumeRolls - salesRolls;
        const closingSqm = openingSqm + receiveSqm - consumeSqm - salesSqm;

        return {
          roll_no: item.item_sr_no,
          fleece_sub_type: item.item_sub_category_name,
          thickness: item.thickness,
          size: `${item.length} X ${item.width}`,
          opening_rolls: Math.max(0, openingRolls),
          opening_sqm: Math.max(0, openingSqm),
          receive_rolls: receiveRolls,
          receive_sqm: receiveSqm,
          consume_rolls: consumeRolls,
          consume_sqm: consumeSqm,
          sales_rolls: salesRolls,
          sales_sqm: salesSqm,
          issue_pressing_rolls: issuePressingRolls,
          issue_pressing_sqm: issuePressingSqm,
          closing_rolls: Math.max(0, closingRolls),
          closing_sqm: Math.max(0, closingSqm),
        };
      })
    );

    const activeStockData = stockData
      .filter(
        (item) =>
          item.opening_rolls > 0 ||
          item.receive_rolls > 0 ||
          item.consume_rolls > 0 ||
          item.sales_rolls > 0 ||
          item.closing_rolls > 0
      )
      .sort((a, b) => {
        const subCmp = (a.fleece_sub_type || '').localeCompare(b.fleece_sub_type || '');
        if (subCmp !== 0) return subCmp;
        return (a.roll_no || 0) - (b.roll_no || 0);
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

    const excelLink = await GenerateFleeceStockReportByRollExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report by roll generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating fleece stock report by roll:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});
