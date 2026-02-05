import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import {
  tapping_done_items_details_model,
  tapping_done_other_details_model,
} from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import { createLogWiseTappingORClippingReportExcel } from '../../../config/downloadExcel/reports2/TappingORClipping/logWiseTappingORClipping.js';

/**
 * Log Wise TappingORClipping (Clipping Item Stock Register) Report Export
 * One row per (Item Group Name, Item Name, Clipping Date, Log X) with
 * Opening Balance, Received Sq. Mtr., Issue Sq. Mtr., Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), Closing Balance.
 * Totals row at end.
 *
 * @route POST /api/V1/report/download-excel-log-wise-tapping-or-clipping-report
 * @access Private
 */
export const LogWiseTappingORClippingReportExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate, filter = {} } = req.body;

    if (!startDate || !endDate) {
      return next(new ApiError('Start date and end date are required', 400));
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
    }

    if (start > end) {
      return next(
        new ApiError('Start date cannot be after end date', 400)
      );
    }

    const itemFilter = {};
    if (filter.item_name) itemFilter.item_name = filter.item_name;
    if (filter.item_group_name)
      itemFilter.item_sub_category_name = filter.item_group_name;

    try {
      // 1. Get received per (item_sub_category_name, item_name, log_no_code, tapping_date) in range
      const receivedAgg = await tapping_done_items_details_model.aggregate([
        { $match: itemFilter },
        {
          $lookup: {
            from: 'tapping_done_other_details',
            localField: 'tapping_done_other_details_id',
            foreignField: '_id',
            as: 'other',
          },
        },
        { $unwind: '$other' },
        {
          $match: {
            'other.tapping_date': { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              item_sub_category_name: '$item_sub_category_name',
              item_name: '$item_name',
              log_no_code: '$log_no_code',
              tapping_date: '$other.tapping_date',
            },
            received: { $sum: '$sqm' },
          },
        },
      ]);

      // 2. Get issue per (log_no_code, item_name, date) from history in range (issue_status = pressing -> Splicing)
      const issueAgg = await tapping_done_history_model.aggregate([
        {
          $match: {
            updatedAt: { $gte: start, $lte: end },
            ...itemFilter,
          },
        },
        {
          $group: {
            _id: {
              log_no_code: '$log_no_code',
              item_name: '$item_name',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$updatedAt',
                },
              },
            },
            issue: { $sum: '$sqm' },
          },
        },
      ]);

      const issueMap = new Map();
      issueAgg.forEach((r) => {
        const k = `${r._id.log_no_code}|${r._id.item_name}|${r._id.date}`;
        issueMap.set(k, r.issue);
      });

      // 3. Build distinct rows (item_group, item_name, log_no_code, tapping_date) from receivedAgg, sorted
      const rowKeys = receivedAgg.map((r) => ({
        item_sub_category_name: r._id.item_sub_category_name,
        item_name: r._id.item_name,
        log_no_code: r._id.log_no_code,
        tapping_date: r._id.tapping_date,
        received: r.received,
      }));

      rowKeys.sort((a, b) => {
        const g = (a.item_sub_category_name || '').localeCompare(
          b.item_sub_category_name || ''
        );
        if (g !== 0) return g;
        const n = (a.item_name || '').localeCompare(b.item_name || '');
        if (n !== 0) return n;
        const l = (a.log_no_code || '').localeCompare(b.log_no_code || '');
        if (l !== 0) return l;
        return new Date(a.tapping_date) - new Date(b.tapping_date);
      });

      if (rowKeys.length === 0) {
        return res.status(404).json(
          new ApiResponse(
            404,
            'No clipping data found for the selected criteria'
          )
        );
      }

      // 4. Opening at period start per (log_no_code, item_name)
      const logItemKeys = new Map();
      rowKeys.forEach((r) => {
        const k = `${r.log_no_code}|${r.item_name}`;
        if (!logItemKeys.has(k))
          logItemKeys.set(k, {
            log_no_code: r.log_no_code,
            item_name: r.item_name,
            item_sub_category_name: r.item_sub_category_name,
          });
      });

      const openingAtStartMap = new Map();
      await Promise.all(
        Array.from(logItemKeys.values()).map(
          async ({ log_no_code, item_name }) => {
            const matchItem = {
              log_no_code,
              item_name,
              ...itemFilter,
            };
            // Stock received before start (tapping_done with tapping_date < start)
            const receivedBefore = await tapping_done_items_details_model.aggregate([
              { $match: matchItem },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'other',
                },
              },
              { $unwind: '$other' },
              { $match: { 'other.tapping_date': { $lt: start } } },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const receivedBeforeStart =
              receivedBefore[0]?.total ?? 0;

            // Issued before start (tapping_done_history updatedAt < start)
            const issuedBefore = await tapping_done_history_model.aggregate([
              {
                $match: {
                  log_no_code,
                  item_name,
                  updatedAt: { $lt: start },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const issuedBeforeStart = issuedBefore[0]?.total ?? 0;

            const opening = Math.max(
              0,
              receivedBeforeStart - issuedBeforeStart
            );
            openingAtStartMap.set(`${log_no_code}|${item_name}`, opening);
          }
        )
      );

      // 5. Build report rows with running opening/closing
      const reportRows = [];
      const runningClosing = new Map();

      for (const row of rowKeys) {
        const key = `${row.log_no_code}|${row.item_name}`;
        const dateStr =
          row.tapping_date instanceof Date
            ? row.tapping_date.toISOString().slice(0, 10)
            : String(row.tapping_date).slice(0, 10);

        let openingBalance = runningClosing.get(key);
        if (openingBalance === undefined) {
          openingBalance = openingAtStartMap.get(key) ?? 0;
        }

        const issueKey = `${row.log_no_code}|${row.item_name}|${dateStr}`;
        const issue = issueMap.get(issueKey) ?? 0;
        // Issue For: only pressing in schema -> map to Splicing
        const hand_splicing = 0;
        const splicing = issue;
        const clipped_packing = 0;
        const damaged = 0;
        const cal_ply_production = 0;
        const closingBalance = Math.max(
          0,
          openingBalance + row.received - issue
        );
        runningClosing.set(key, closingBalance);

        reportRows.push({
          item_group_name: row.item_sub_category_name,
          item_name: row.item_name,
          clipping_date: row.tapping_date,
          log_x: row.log_no_code,
          opening_balance: openingBalance,
          received: row.received,
          issue,
          hand_splicing,
          splicing,
          clipped_packing,
          damaged,
          cal_ply_production,
          closing_balance: closingBalance,
        });
      }

      const excelLink = await createLogWiseTappingORClippingReportExcel(
        reportRows,
        startDate,
        endDate,
        filter
      );

      return res.json(
        new ApiResponse(
          200,
          'Log wise tapping/clipping report generated successfully',
          excelLink
        )
      );
    } catch (error) {
      console.error(
        'Error generating log wise tapping/clipping report:',
        error
      );
      return next(
        new ApiError(
          error.message || 'Failed to generate report',
          500
        )
      );
    }
  }
);
