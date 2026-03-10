import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { grouping_done_details_model } from '../../../../database/schema/factory/grouping/grouping_done.schema.js';
import { GenerateGroupingStockRegisterExcel } from '../../../../config/downloadExcel/reports2/Grouping/Stock_Register/groupingStockRegister.js';

/**
 * Grouping Stock Register Report – Excel download.
 * Generates a date-wise stock register in sheets (no_of_sheets) showing:
 *   Item Group Name, Sales Item Name, Grouping Date, Log X, Thickness,
 *   Opening Balance, Grouping Done, Issue for tapping, Issue for Challan,
 *   Issue Sales, Damage, Closing Balance.
 *
 * One row per unique (item_sub_category_name, item_name, grouping_done_date, log_no_code, thickness).
 * Balances may be negative.
 *
 * Collections used:
 *   grouping_done_details        – grouping session date
 *   grouping_done_items_details  – items, available sheets, damage
 *   grouping_done_history        – issue records by issue_status
 *
 * @route POST /report/download-excel-grouping-stock-register
 */
export const GroupingStockRegisterExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate } = req.body;

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

    /**
     * Single aggregation pipeline:
     *  1. Match grouping sessions in the date range.
     *  2. Look up items for each session.
     *  3. Look up history records for each item.
     *  4. Compute issue sub-totals per item using $filter + $sum.
     *  5. Group by (item_sub_category_name, item_name, grouping_done_date, log_no_code, thickness)
     *     summing sheets, available sheets, damage, and each issue type.
     *  6. Sort for a clean display order.
     */
    const pipeline = [
      // Stage 1 – filter sessions by date range
      {
        $match: {
          grouping_done_date: { $gte: start, $lte: end },
        },
      },

      // Stage 2 – attach items
      {
        $lookup: {
          from: 'grouping_done_items_details',
          localField: '_id',
          foreignField: 'grouping_done_other_details_id',
          as: 'items',
        },
      },
      {
        $unwind: {
          path: '$items',
          preserveNullAndEmptyArrays: false,
        },
      },

      // Stage 3 – attach history records for each item
      {
        $lookup: {
          from: 'grouping_done_history',
          localField: 'items._id',
          foreignField: 'grouping_done_item_id',
          as: 'item_history',
        },
      },

      // Stage 4 – compute per-item issue totals from history
      {
        $addFields: {
          item_issue_tapping: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$item_history',
                    cond: { $eq: ['$$this.issue_status', 'tapping'] },
                  },
                },
                in: '$$this.no_of_sheets',
              },
            },
          },
          item_issue_challan: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$item_history',
                    cond: { $eq: ['$$this.issue_status', 'challan'] },
                  },
                },
                in: '$$this.no_of_sheets',
              },
            },
          },
          item_issue_sales: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$item_history',
                    cond: { $eq: ['$$this.issue_status', 'order'] },
                  },
                },
                in: '$$this.no_of_sheets',
              },
            },
          },
        },
      },

      // Stage 5 – group by (item_sub_category_name, item_name, grouping_done_date, log_no_code, thickness)
      {
        $group: {
          _id: {
            item_sub_category_name: '$items.item_sub_category_name',
            item_name: '$items.item_name',
            grouping_done_date: '$grouping_done_date',
            log_no_code: '$items.log_no_code',
            thickness: '$items.thickness',
          },
          grouping_done: { $sum: '$items.no_of_sheets' },
          current_available: { $sum: '$items.available_details.no_of_sheets' },
          damage: {
            $sum: { $cond: ['$items.is_damaged', '$items.no_of_sheets', 0] },
          },
          issue_tapping: { $sum: '$item_issue_tapping' },
          issue_challan: { $sum: '$item_issue_challan' },
          issue_sales: { $sum: '$item_issue_sales' },
        },
      },

      // Stage 6 – sort
      {
        $sort: {
          '_id.item_sub_category_name': 1,
          '_id.item_name': 1,
          '_id.grouping_done_date': 1,
          '_id.log_no_code': 1,
        },
      },
    ];

    const rawRows = await grouping_done_details_model.aggregate(pipeline);

    if (!rawRows || rawRows.length === 0) {
      return res.status(404).json(
        new ApiResponse(404, 'No grouping data found for the selected period')
      );
    }

    // Compute opening and closing balances
    const rows = rawRows.map((r) => {
      const issued_in_period =
        (r.issue_tapping || 0) + (r.issue_challan || 0) + (r.issue_sales || 0);

      const opening_balance =
        (r.current_available || 0) + issued_in_period - (r.grouping_done || 0);

      const closing_balance =
        opening_balance +
        (r.grouping_done || 0) -
        (r.issue_tapping || 0) -
        (r.issue_challan || 0) -
        (r.issue_sales || 0) -
        (r.damage || 0);

      return {
        item_group_name: r._id.item_sub_category_name,
        item_name: r._id.item_name,
        grouping_done_date: r._id.grouping_done_date,
        log_no_code: r._id.log_no_code,
        thickness: r._id.thickness,
        opening_balance,
        grouping_done: r.grouping_done || 0,
        issue_tapping: r.issue_tapping || 0,
        issue_challan: r.issue_challan || 0,
        issue_sales: r.issue_sales || 0,
        damage: r.damage || 0,
        closing_balance,
      };
    });

    const excelLink = await GenerateGroupingStockRegisterExcel(
      rows,
      startDate,
      endDate
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        'Grouping stock register generated successfully',
        excelLink
      )
    );
  }
);
