import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import { face_inventory_items_details } from '../../../database/schema/inventory/face/face.schema.js';
import face_history_model from '../../../database/schema/inventory/face/face.history.schema.js';
import { GenerateFaceStockReportExcel } from '../../../config/downloadExcel/reports2/Face/faceStockReport.js';

/**
 * Face Stock Report Export
 * Generates Excel report with Item name, Thickness, Opening Balance, Received Metres,
 * Issued Metres, Closing Bal. Uses face_inventory_items_details, face_inventory_invoice_details,
 * and face_history.
 *
 * @route POST /report/download-stock-report-face
 * @access Private
 */
export const FaceStockReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

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
    // Only include (item_name, thickness) that have at least one inward in the date range
    const uniqueCombinations = await face_inventory_items_details.aggregate([
      {
        $match: {
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $lookup: {
          from: 'face_inventory_invoice_details',
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
          _id: {
            item_name: '$item_name',
            thickness: '$thickness',
          },
        },
      },
    ]);

    if (uniqueCombinations.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          new ApiResponse(
            StatusCodes.NOT_FOUND,
            'No stock data found for the selected period'
          )
        );
    }

    const stockData = await Promise.all(
      uniqueCombinations.map(async (combo) => {
        const { item_name, thickness } = combo._id;

        const currentInventorySqm = await face_inventory_items_details.aggregate([
          {
            $match: {
              item_name,
              thickness,
              deleted_at: null,
            },
          },
          {
            $group: {
              _id: null,
              total_sqm: { $sum: '$available_sqm' },
            },
          },
        ]);

        const currentAvailableSqm = currentInventorySqm[0]?.total_sqm || 0;

        const receivedByDate = await face_inventory_items_details.aggregate([
          {
            $match: {
              item_name,
              thickness,
              deleted_at: null,
            },
          },
          {
            $lookup: {
              from: 'face_inventory_invoice_details',
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
              _id: '$invoice.inward_date',
              total_sqm: { $sum: '$total_sq_meter' },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        const issuedSqm = await face_history_model.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $lookup: {
              from: 'face_inventory_items_details',
              localField: 'face_item_id',
              foreignField: '_id',
              as: 'face_item',
            },
          },
          {
            $unwind: '$face_item',
          },
          {
            $match: {
              'face_item.item_name': item_name,
              'face_item.thickness': thickness,
            },
          },
          {
            $group: {
              _id: null,
              total_sqm: { $sum: '$issued_sqm' },
            },
          },
        ]);

        const issuedSqmValue = issuedSqm[0]?.total_sqm || 0;
        const totalReceived = receivedByDate.reduce((sum, r) => sum + (r.total_sqm || 0), 0);
        const openingBalance = Math.max(
          0,
          currentAvailableSqm + issuedSqmValue - totalReceived
        );

        const rows = [];
        let runningOpen = openingBalance;
        for (let i = 0; i < receivedByDate.length; i++) {
          const rec = receivedByDate[i];
          const receivedThisDate = rec.total_sqm || 0;
          const isLast = i === receivedByDate.length - 1;
          const issuedThisRow = isLast ? issuedSqmValue : 0;
          const closingBal = Math.max(
            0,
            runningOpen + receivedThisDate - issuedThisRow
          );
          rows.push({
            item_name,
            thickness,
            inward_date: rec._id,
            opening_balance: runningOpen,
            received_metres: receivedThisDate,
            issued_metres: issuedThisRow,
            closing_bal: closingBal,
          });
          runningOpen = closingBal;
        }

        return rows;
      })
    );

    const flatStockData = stockData.flat();
    const activeStockData = flatStockData.filter(
      (item) =>
        item.opening_balance > 0 ||
        item.received_metres > 0 ||
        item.issued_metres > 0 ||
        item.closing_bal > 0
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

    const downloadLink = await GenerateFaceStockReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          'Stock report generated successfully',
          downloadLink
        )
      );
  } catch (error) {
    console.error('Error generating face stock report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
