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
  GenerateFleeceStockReportByInwardExcel,
} from '../../../config/downloadExcel/reports2/Fleece/fleeceStockReport.js';

/** Round stock value; treat floating-point noise (|v| < 1e-10) as 0 */
const roundStock = (v, decimals = 4) => {
  const rounded = Math.round(v * 10 ** decimals) / 10 ** decimals;
  return Math.abs(rounded) < 1e-10 ? 0 : rounded;
};

/** Fleece report metre/SQM precision is fixed to 3 decimals. */
const roundMetricValue = (v) => roundStock(v, 3);

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

        const [challan, order, issuePressing] = await Promise.all([
          fleece_history_model.aggregate([
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
          ]),
          fleece_history_model.aggregate([
            {
              $match: {
                fleece_item_id: { $in: itemIds },
                issue_status: 'order',
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
          ]),
        ]);

        const receiveRolls = receives[0]?.total_rolls || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const challanRolls = challan[0]?.total_rolls || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderRolls = order[0]?.total_rolls || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePressingRolls = issuePressing[0]?.total_rolls || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeRolls = challanRolls + orderRolls + issuePressingRolls;
        const consumeSqm = challanSqm + orderSqm + issuePressingSqm;
        const currentRolls = item.current_rolls || 0;
        const currentSqm = item.current_sqm || 0;

        const openingRolls = currentRolls + consumeRolls - receiveRolls;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingRolls = openingRolls + receiveRolls - consumeRolls;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;

        return {
          fleece_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_rolls: Math.max(0, roundStock(openingRolls, 0)),
          opening_sqm: Math.max(0, roundMetricValue(openingSqm)),
          receive_rolls: receiveRolls,
          receive_sqm: roundMetricValue(receiveSqm),
          consume_rolls: consumeRolls,
          consume_sqm: roundMetricValue(consumeSqm),
          challan_rolls: challanRolls,
          challan_sqm: roundMetricValue(challanSqm),
          order_rolls: orderRolls,
          order_sqm: roundMetricValue(orderSqm),
          issue_pressing_rolls: issuePressingRolls,
          issue_pressing_sqm: roundMetricValue(issuePressingSqm),
          closing_rolls: Math.max(0, roundStock(closingRolls, 0)),
          closing_sqm: Math.max(0, roundMetricValue(closingSqm)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing).
    const activeStockData = stockData.filter(
      (item) =>
        item.receive_rolls > 0 ||
        item.consume_rolls > 0 ||
        item.challan_rolls > 0 ||
        item.order_rolls > 0 ||
        item.issue_pressing_rolls > 0
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

        const [challan, order, issuePressing] = await Promise.all([
          fleece_history_model.aggregate([
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
          ]),
          fleece_history_model.aggregate([
            {
              $match: {
                fleece_item_id: { $in: itemIds },
                issue_status: 'order',
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
          ]),
        ]);

        const receiveRolls = receives[0]?.total_rolls || 0;
        const receiveSqm = receives[0]?.total_sqm || 0;
        const challanRolls = challan[0]?.total_rolls || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderRolls = order[0]?.total_rolls || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePressingRolls = issuePressing[0]?.total_rolls || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeRolls = challanRolls + orderRolls + issuePressingRolls;
        const consumeSqm = challanSqm + orderSqm + issuePressingSqm;
        const currentRolls = item.current_rolls || 0;
        const currentSqm = item.current_sqm || 0;

        const openingRolls = currentRolls + consumeRolls - receiveRolls;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingRolls = openingRolls + receiveRolls - consumeRolls;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;

        return {
          item_name: item_name || '',
          fleece_sub_type: item_sub_category_name,
          thickness,
          size: `${length} X ${width}`,
          opening_rolls: Math.max(0, roundStock(openingRolls, 0)),
          opening_sqm: Math.max(0, roundMetricValue(openingSqm)),
          receive_rolls: receiveRolls,
          receive_sqm: roundMetricValue(receiveSqm),
          consume_rolls: consumeRolls,
          consume_sqm: roundMetricValue(consumeSqm),
          challan_rolls: challanRolls,
          challan_sqm: roundMetricValue(challanSqm),
          order_rolls: orderRolls,
          order_sqm: roundMetricValue(orderSqm),
          issue_pressing_rolls: issuePressingRolls,
          issue_pressing_sqm: roundMetricValue(issuePressingSqm),
          closing_rolls: Math.max(0, roundStock(closingRolls, 0)),
          closing_sqm: Math.max(0, roundMetricValue(closingSqm)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing).
    const activeStockData = stockData.filter(
      (row) =>
        row.receive_rolls > 0 ||
        row.consume_rolls > 0 ||
        row.challan_rolls > 0 ||
        row.order_rolls > 0 ||
        row.issue_pressing_rolls > 0
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
 * Fleece Stock Report – By Inward Number. Each row = one inward per (sub_category, thickness, size).
 * Multiple items in same inward with different specs = multiple rows (same inward_no, different specs).
 *
 * @route POST /report/download-stock-report-fleece-by-inward
 * @access Private
 */
export const fleeceStockReportByInwardCsv = catchAsync(async (req, res, next) => {
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
    const inwardGroups = await fleece_inventory_items_modal.aggregate([
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
        $group: {
          _id: {
            invoice_id: '$invoice_id',
            item_sub_category_name: '$item_sub_category_name',
            thickness: '$thickness',
            length: '$length',
            width: '$width',
          },
          inward_sr_no: { $first: '$invoice.inward_sr_no' },
          inward_date: { $first: '$invoice.inward_date' },
          item_ids: { $push: '$_id' },
          total_number_of_roll: { $sum: '$number_of_roll' },
          total_sq_meter: { $sum: '$total_sq_meter' },
          current_rolls: { $sum: '$available_number_of_roll' },
          current_sqm: { $sum: '$available_sqm' },
        },
      },
    ]).then((groups) => groups.filter((g) => g.inward_sr_no != null));

    const stockData = await Promise.all(
      inwardGroups.map(async (group) => {
        const { item_sub_category_name, thickness, length, width } = group._id;
        const itemIds = group.item_ids;
        const inwardDate = group.inward_date;

        const receiveRolls =
          inwardDate && inwardDate >= start && inwardDate <= end
            ? (group.total_number_of_roll || 0)
            : 0;
        const receiveSqm =
          inwardDate && inwardDate >= start && inwardDate <= end
            ? (group.total_sq_meter || 0)
            : 0;

        const [challan, order, issuePressing] = await Promise.all([
          fleece_history_model.aggregate([
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
          ]),
          fleece_history_model.aggregate([
            {
              $match: {
                fleece_item_id: { $in: itemIds },
                issue_status: 'order',
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
          ]),
        ]);

        const challanRolls = challan[0]?.total_rolls || 0;
        const challanSqm = challan[0]?.total_sqm || 0;
        const orderRolls = order[0]?.total_rolls || 0;
        const orderSqm = order[0]?.total_sqm || 0;
        const issuePressingRolls = issuePressing[0]?.total_rolls || 0;
        const issuePressingSqm = issuePressing[0]?.total_sqm || 0;
        const consumeRolls = challanRolls + orderRolls + issuePressingRolls;
        const consumeSqm = challanSqm + orderSqm + issuePressingSqm;
        const currentRolls = group.current_rolls ?? 0;
        const currentSqm = group.current_sqm ?? 0;

        const openingRolls = currentRolls + consumeRolls - receiveRolls;
        const openingSqm = currentSqm + consumeSqm - receiveSqm;
        const closingRolls = openingRolls + receiveRolls - consumeRolls;
        const closingSqm = openingSqm + receiveSqm - consumeSqm;

        return {
          inward_no: group.inward_sr_no ?? '',
          fleece_sub_type: item_sub_category_name ?? '',
          thickness: thickness ?? '',
          size: `${length ?? ''} X ${width ?? ''}`,
          opening_rolls: Math.max(0, roundStock(openingRolls, 0)),
          opening_sqm: Math.max(0, roundMetricValue(openingSqm)),
          receive_rolls: receiveRolls,
          receive_sqm: roundMetricValue(receiveSqm),
          consume_rolls: consumeRolls,
          consume_sqm: roundMetricValue(consumeSqm),
          challan_rolls: challanRolls,
          challan_sqm: roundMetricValue(challanSqm),
          order_rolls: orderRolls,
          order_sqm: roundMetricValue(orderSqm),
          issue_pressing_rolls: issuePressingRolls,
          issue_pressing_sqm: roundMetricValue(issuePressingSqm),
          closing_rolls: Math.max(0, roundStock(closingRolls, 0)),
          closing_sqm: Math.max(0, roundMetricValue(closingSqm)),
        };
      })
    );

    // Only include rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing).
    const activeStockData = stockData
      .filter(
        (item) =>
          item.receive_rolls > 0 ||
          item.consume_rolls > 0 ||
          item.challan_rolls > 0 ||
          item.order_rolls > 0 ||
          item.issue_pressing_rolls > 0
      )
      .sort((a, b) => {
        const inwardCmp = (a.inward_no ?? 0) - (b.inward_no ?? 0);
        if (inwardCmp !== 0) return inwardCmp;
        const subCmp = (a.fleece_sub_type || '').localeCompare(b.fleece_sub_type || '');
        if (subCmp !== 0) return subCmp;
        return (a.thickness ?? 0) - (b.thickness ?? 0);
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

    const excelLink = await GenerateFleeceStockReportByInwardExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'Stock report by inward number generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating fleece stock report by inward:', error);
    return next(new ApiError(error.message || 'Failed to generate stock report', 500));
  }
});
