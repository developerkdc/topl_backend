import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { grouping_done_details_model } from '../../../../database/schema/factory/grouping/grouping_done.schema.js';
import grouping_done_history_model from '../../../../database/schema/factory/grouping/grouping_done_history.schema.js';
import { GenerateGroupingStockRegisterThicknessWiseExcel } from '../../../../config/downloadExcel/reports2/Grouping/Stock_Register/groupingStockRegisterThicknessWise.js';

/**
 * Grouping Stock Register Thickness Wise – Excel download.
 * Generates a thickness-wise stock register in sheets and SQM showing:
 *   Item Group Name, Sales Item Name, Thickness,
 *   then for each quantity (Opening Balance, Grouping Done, Issue for tapping,
 *   Issue for Challan, Issue Sales, Damage, Closing Balance): (Sheets) and (SQM) columns.
 *
 * One row per unique (item_sub_category_name, item_name, thickness).
 * Same balance formulas as the date-wise register.
 * Balances may be negative.
 *
 * Collections used:
 *   grouping_done_details        – grouping session date (for date-range filter)
 *   grouping_done_items_details  – items, available sheets/sqm, damage
 *   grouping_done_history        – issue records by issue_status
 *
 * @route POST /report/download-excel-grouping-stock-register-thickness-wise
 */
export const GroupingStockRegisterThicknessWiseExcel = catchAsync(
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
     *  5. Group by (item_sub_category_name, item_name, thickness) — 3-key group.
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
                    cond: {
                      $or: [
                        { $eq: ['$$this.issue_status', 'tapping'] },
                        { $eq: ['$$this.issued_for', 'STOCK'] },
                        { $eq: ['$$this.issued_for', 'SAMPLE'] },
                        {
                          $and: [
                            {
                              $or: [
                                { $eq: ['$$this.issue_status', 'order'] },
                                { $eq: ['$$this.issued_for', 'ORDER'] },
                              ],
                            },
                            { $ne: ['$$this.order_category', 'RAW'] },
                          ],
                        },
                      ],
                    },
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
                    cond: {
                      $or: [
                        { $eq: ['$$this.issue_status', 'tapping'] },
                        { $eq: ['$$this.issued_for', 'STOCK'] },
                        { $eq: ['$$this.issued_for', 'SAMPLE'] },
                        {
                          $and: [
                            {
                              $or: [
                                { $eq: ['$$this.issue_status', 'order'] },
                                { $eq: ['$$this.issued_for', 'ORDER'] },
                              ],
                            },
                            { $ne: ['$$this.order_category', 'RAW'] },
                          ],
                        },
                      ],
                    },
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
                    cond: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$$this.issue_status', 'order'] },
                            { $eq: ['$$this.issued_for', 'ORDER'] },
                          ],
                        },
                        { $eq: ['$$this.order_category', 'RAW'] },
                      ],
                    },
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
                    cond: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$$this.issue_status', 'order'] },
                            { $eq: ['$$this.issued_for', 'ORDER'] },
                          ],
                        },
                        { $eq: ['$$this.order_category', 'RAW'] },
                      ],
                    },
                  },
                },
                in: '$$this.sqm',
              },
            },
          },
        },
      },

      // Stage 5 – group by (item_sub_category_name, item_name, thickness)
      {
        $group: {
          _id: {
            item_sub_category_name: '$items.item_sub_category_name',
            item_name: '$items.item_name',
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
          '_id.item_name': 1,
          '_id.thickness': 1,
        },
      },
    ];

    const rawRows = await grouping_done_details_model.aggregate(pipeline);

    /**
     * Orphan pipeline: Include items that have issue history in the period
     * but whose grouping session was outside the period.
     */
    const orphanPipeline = [
      { $match: { updatedAt: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'grouping_done_items_details',
          localField: 'grouping_done_item_id',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'grouping_done_details',
          localField: 'item.grouping_done_other_details_id',
          foreignField: '_id',
          as: 'session',
        },
      },
      { $unwind: { path: '$session', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          $or: [
            { 'session.grouping_done_date': { $lt: start } },
            { 'session.grouping_done_date': { $gt: end } },
          ],
        },
      },
      {
        $addFields: {
          is_tapping: {
            $or: [
              { $eq: ['$issue_status', 'tapping'] },
              { $eq: ['$issued_for', 'STOCK'] },
              { $eq: ['$issued_for', 'SAMPLE'] },
              {
                $and: [
                  {
                    $or: [
                      { $eq: ['$issue_status', 'order'] },
                      { $eq: ['$issued_for', 'ORDER'] },
                    ],
                  },
                  { $ne: ['$order_category', 'RAW'] },
                ],
              },
            ],
          },
          is_challan: { $eq: ['$issue_status', 'challan'] },
          is_order: {
            $and: [
              {
                $or: [
                  { $eq: ['$issue_status', 'order'] },
                  { $eq: ['$issued_for', 'ORDER'] },
                ],
              },
              { $eq: ['$order_category', 'RAW'] },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$grouping_done_item_id',
          item_sub_category_name: { $first: '$item.item_sub_category_name' },
          item_name: { $first: '$item.item_name' },
          thickness: { $first: '$item.thickness' },
          grouping_done: { $first: '$item.no_of_sheets' },
          grouping_done_sqm: { $first: '$item.sqm' },
          current_available: {
            $first: '$item.available_details.no_of_sheets',
          },
          current_available_sqm: { $first: '$item.available_details.sqm' },
          damage: {
            $first: {
              $cond: ['$item.is_damaged', '$item.no_of_sheets', 0],
            },
          },
          damage_sqm: {
            $first: { $cond: ['$item.is_damaged', '$item.sqm', 0] },
          },
          issue_tapping: {
            $sum: { $cond: ['$is_tapping', '$no_of_sheets', 0] },
          },
          issue_tapping_sqm: { $sum: { $cond: ['$is_tapping', '$sqm', 0] } },
          issue_challan: {
            $sum: { $cond: ['$is_challan', '$no_of_sheets', 0] },
          },
          issue_challan_sqm: { $sum: { $cond: ['$is_challan', '$sqm', 0] } },
          issue_sales: { $sum: { $cond: ['$is_order', '$no_of_sheets', 0] } },
          issue_sales_sqm: { $sum: { $cond: ['$is_order', '$sqm', 0] } },
        },
      },
      {
        $group: {
          _id: {
            item_sub_category_name: '$item_sub_category_name',
            item_name: '$item_name',
            thickness: '$thickness',
          },
          grouping_done: { $sum: '$grouping_done' },
          grouping_done_sqm: { $sum: '$grouping_done_sqm' },
          current_available: { $sum: '$current_available' },
          current_available_sqm: { $sum: '$current_available_sqm' },
          damage: { $sum: '$damage' },
          damage_sqm: { $sum: '$damage_sqm' },
          issue_tapping: { $sum: '$issue_tapping' },
          issue_tapping_sqm: { $sum: '$issue_tapping_sqm' },
          issue_challan: { $sum: '$issue_challan' },
          issue_challan_sqm: { $sum: '$issue_challan_sqm' },
          issue_sales: { $sum: '$issue_sales' },
          issue_sales_sqm: { $sum: '$issue_sales_sqm' },
        },
      },
      {
        $sort: {
          '_id.item_sub_category_name': 1,
          '_id.item_name': 1,
          '_id.thickness': 1,
        },
      },
    ];

    const orphanRows = await grouping_done_history_model.aggregate(
      orphanPipeline
    );

    const rowMap = new Map();
    const thicknessWiseKey = (r) =>
      `${r._id.item_sub_category_name}|${r._id.item_name}|${r._id.thickness}`;

    for (const r of rawRows) {
      rowMap.set(thicknessWiseKey(r), {
        _id: r._id,
        grouping_done: r.grouping_done || 0,
        grouping_done_sqm: r.grouping_done_sqm || 0,
        current_available: r.current_available || 0,
        current_available_sqm: r.current_available_sqm || 0,
        damage: r.damage || 0,
        damage_sqm: r.damage_sqm || 0,
        issue_tapping: r.issue_tapping || 0,
        issue_tapping_sqm: r.issue_tapping_sqm || 0,
        issue_challan: r.issue_challan || 0,
        issue_challan_sqm: r.issue_challan_sqm || 0,
        issue_sales: r.issue_sales || 0,
        issue_sales_sqm: r.issue_sales_sqm || 0,
      });
    }
    for (const r of orphanRows) {
      const key = thicknessWiseKey(r);
      const existing = rowMap.get(key);
      if (existing) {
        existing.grouping_done += 0;
        existing.grouping_done_sqm += 0;
        existing.current_available += r.current_available || 0;
        existing.current_available_sqm += r.current_available_sqm || 0;
        existing.damage += r.damage || 0;
        existing.damage_sqm += r.damage_sqm || 0;
        existing.issue_tapping += r.issue_tapping || 0;
        existing.issue_tapping_sqm += r.issue_tapping_sqm || 0;
        existing.issue_challan += r.issue_challan || 0;
        existing.issue_challan_sqm += r.issue_challan_sqm || 0;
        existing.issue_sales += r.issue_sales || 0;
        existing.issue_sales_sqm += r.issue_sales_sqm || 0;
      } else {
        rowMap.set(key, {
          _id: r._id,
          grouping_done: 0,
          grouping_done_sqm: 0,
          current_available: r.current_available || 0,
          current_available_sqm: r.current_available_sqm || 0,
          damage: r.damage || 0,
          damage_sqm: r.damage_sqm || 0,
          issue_tapping: r.issue_tapping || 0,
          issue_tapping_sqm: r.issue_tapping_sqm || 0,
          issue_challan: r.issue_challan || 0,
          issue_challan_sqm: r.issue_challan_sqm || 0,
          issue_sales: r.issue_sales || 0,
          issue_sales_sqm: r.issue_sales_sqm || 0,
        });
      }
    }

    const mergedRows = Array.from(rowMap.values()).sort((a, b) => {
      const na = a._id.item_sub_category_name,
        nb = b._id.item_sub_category_name;
      if (na !== nb) return na.localeCompare(nb);
      const ia = a._id.item_name,
        ib = b._id.item_name;
      if (ia !== ib) return ia.localeCompare(ib);
      return (a._id.thickness || 0) - (b._id.thickness || 0);
    });

    if (mergedRows.length === 0) {
      return res.status(404).json(
        new ApiResponse(404, 'No grouping data found for the selected period')
      );
    }

    // Compute opening and closing balances (sheets + SQM)
    const rows = mergedRows.map((r) => {
      const issued_in_period =
        (r.issue_tapping || 0) + (r.issue_challan || 0) + (r.issue_sales || 0);
      const issued_in_period_sqm =
        (r.issue_tapping_sqm || 0) +
        (r.issue_challan_sqm || 0) +
        (r.issue_sales_sqm || 0);

      const opening_balance = Math.max(
        0,
        (r.current_available || 0) + issued_in_period - (r.grouping_done || 0)
      );
      const opening_balance_sqm = Math.max(
        0,
        (r.current_available_sqm || 0) +
          issued_in_period_sqm -
          (r.grouping_done_sqm || 0)
      );

      const closing_balance = Math.max(
        0,
        opening_balance +
          (r.grouping_done || 0) -
          (r.issue_tapping || 0) -
          (r.issue_challan || 0) -
          (r.issue_sales || 0) -
          (r.damage || 0)
      );
      const closing_balance_sqm = Math.max(
        0,
        opening_balance_sqm +
          (r.grouping_done_sqm || 0) -
          (r.issue_tapping_sqm || 0) -
          (r.issue_challan_sqm || 0) -
          (r.issue_sales_sqm || 0) -
          (r.damage_sqm || 0)
      );

      return {
        item_group_name: r._id.item_sub_category_name,
        item_name: r._id.item_name,
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

    const excelLink = await GenerateGroupingStockRegisterThicknessWiseExcel(
      rows,
      startDate,
      endDate
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        'Grouping stock register (thickness wise) generated successfully',
        excelLink
      )
    );
  }
);
