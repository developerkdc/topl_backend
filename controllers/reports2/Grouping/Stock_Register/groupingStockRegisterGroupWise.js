import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { grouping_done_details_model } from '../../../../database/schema/factory/grouping/grouping_done.schema.js';
import { GenerateGroupingStockRegisterGroupWiseExcel } from '../../../../config/downloadExcel/reports2/Grouping/Stock_Register/groupingStockRegisterGroupWise.js';

/**
 * Grouping Stock Register Group Wise – Excel download.
 * Generates a group-wise stock register in sheets and SQM showing:
 *   Item Group Name, Thickness,
 *   then for each quantity (Opening Balance, Grouping Done, Issue for tapping,
 *   Issue for Challan, Issue Sales, Damage, Closing Balance): (Sheets) and (SQM) columns.
 *
 * One row per unique (item_sub_category_name, thickness).
 * Same balance formulas as date-wise and thickness-wise registers.
 * Balances may be negative.
 *
 * Collections used:
 *   grouping_done_details        – grouping session date (for date-range filter)
 *   grouping_done_items_details  – items, available sheets/sqm, damage
 *   grouping_done_history        – issue records by issue_status
 *
 * @route POST /report/download-excel-grouping-stock-register-group-wise
 */
export const GroupingStockRegisterGroupWiseExcel = catchAsync(
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
     *  5. Group by (item_sub_category_name, thickness) — 2-key group.
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

      // Stage 4 – compute per-item issue totals from history (sheets + SQM)
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
          item_issue_tapping_sqm: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$item_history',
                    cond: { $eq: ['$$this.issue_status', 'tapping'] },
                  },
                },
                in: '$$this.sqm',
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
          item_issue_challan_sqm: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$item_history',
                    cond: { $eq: ['$$this.issue_status', 'challan'] },
                  },
                },
                in: '$$this.sqm',
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
          item_issue_sales_sqm: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$item_history',
                    cond: { $eq: ['$$this.issue_status', 'order'] },
                  },
                },
                in: '$$this.sqm',
              },
            },
          },
        },
      },

      // Stage 5 – group by (item_sub_category_name, thickness) — 2-key group
      {
        $group: {
          _id: {
            item_sub_category_name: '$items.item_sub_category_name',
            thickness: '$items.thickness',
          },
          grouping_done: { $sum: '$items.no_of_sheets' },
          grouping_done_sqm: { $sum: '$items.sqm' },
          current_available: { $sum: '$items.available_details.no_of_sheets' },
          current_available_sqm: { $sum: '$items.available_details.sqm' },
          damage: {
            $sum: { $cond: ['$items.is_damaged', '$items.no_of_sheets', 0] },
          },
          damage_sqm: {
            $sum: { $cond: ['$items.is_damaged', '$items.sqm', 0] },
          },
          issue_tapping: { $sum: '$item_issue_tapping' },
          issue_tapping_sqm: { $sum: '$item_issue_tapping_sqm' },
          issue_challan: { $sum: '$item_issue_challan' },
          issue_challan_sqm: { $sum: '$item_issue_challan_sqm' },
          issue_sales: { $sum: '$item_issue_sales' },
          issue_sales_sqm: { $sum: '$item_issue_sales_sqm' },
        },
      },

      // Stage 6 – sort
      {
        $sort: {
          '_id.item_sub_category_name': 1,
          '_id.thickness': 1,
        },
      },
    ];

    const rawRows = await grouping_done_details_model.aggregate(pipeline);

    if (!rawRows || rawRows.length === 0) {
      return res.status(404).json(
        new ApiResponse(404, 'No grouping data found for the selected period')
      );
    }

    // Compute opening and closing balances (sheets + SQM)
    const rows = rawRows.map((r) => {
      const issued_in_period =
        (r.issue_tapping || 0) + (r.issue_challan || 0) + (r.issue_sales || 0);
      const issued_in_period_sqm =
        (r.issue_tapping_sqm || 0) +
        (r.issue_challan_sqm || 0) +
        (r.issue_sales_sqm || 0);

      const opening_balance =
        (r.current_available || 0) + issued_in_period - (r.grouping_done || 0);
      const opening_balance_sqm =
        (r.current_available_sqm || 0) +
        issued_in_period_sqm -
        (r.grouping_done_sqm || 0);

      const closing_balance =
        opening_balance +
        (r.grouping_done || 0) -
        (r.issue_tapping || 0) -
        (r.issue_challan || 0) -
        (r.issue_sales || 0) -
        (r.damage || 0);
      const closing_balance_sqm =
        opening_balance_sqm +
        (r.grouping_done_sqm || 0) -
        (r.issue_tapping_sqm || 0) -
        (r.issue_challan_sqm || 0) -
        (r.issue_sales_sqm || 0) -
        (r.damage_sqm || 0);

      return {
        item_group_name: r._id.item_sub_category_name,
        thickness: r._id.thickness,
        opening_balance,
        opening_balance_sqm,
        grouping_done: r.grouping_done || 0,
        grouping_done_sqm: r.grouping_done_sqm || 0,
        issue_tapping: r.issue_tapping || 0,
        issue_tapping_sqm: r.issue_tapping_sqm || 0,
        issue_challan: r.issue_challan || 0,
        issue_challan_sqm: r.issue_challan_sqm || 0,
        issue_sales: r.issue_sales || 0,
        issue_sales_sqm: r.issue_sales_sqm || 0,
        damage: r.damage || 0,
        damage_sqm: r.damage_sqm || 0,
        closing_balance,
        closing_balance_sqm,
      };
    });

    const excelLink = await GenerateGroupingStockRegisterGroupWiseExcel(
      rows,
      startDate,
      endDate
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        'Grouping stock register (group wise) generated successfully',
        excelLink
      )
    );
  }
);
