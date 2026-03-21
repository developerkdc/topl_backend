import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import {
  veneer_inventory_items_model,
  veneer_inventory_invoice_model,
  veneer_inventory_items_view_modal,
} from '../../../database/schema/inventory/venner/venner.schema.js';
import { issues_for_smoking_dying_model } from '../../../database/schema/factory/smoking_dying/issues_for_smoking_dying.schema.js';
import { issues_for_grouping_model } from '../../../database/schema/factory/grouping/issues_for_grouping.schema.js';
import { process_done_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { process_done_items_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { grouping_done_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import { inward_type, issues_for_status } from '../../../database/Utils/constants/constants.js';
import { createVeneerInwardReportExcel } from '../../../config/downloadExcel/reports2/Veneer/veneerInwardReport.js';

/**
 * Veneer Inward Report Export
 * Generates Excel report: one row per item with Opening, Purchase, Issue Total,
 * Smoking (Issue to Smoke, Smoke Done), Grouping (Issue to group, Issue to group Done),
 * Sales, Job Work Challan, Damage, Closing.
 *
 * @route POST /api/V1/report/download-excel-veneer-inward-report
 * @access Private
 */
export const VeneerInwardReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  const itemFilter = filter.item_name ? { item_name: filter.item_name } : {};

  try {
    // Distinct item_name only from activity in date range: inward in [start,end], or issue-to-smoke/group in [start,end]
    const fromVeneerItems = await veneer_inventory_items_model.aggregate([
      { $match: { deleted_at: null, ...itemFilter } },
      { $lookup: { from: 'veneer_inventory_invoice_details', localField: 'invoice_id', foreignField: '_id', as: 'inv' } },
      { $unwind: { path: '$inv', preserveNullAndEmptyArrays: false } },
      { $match: { 'inv.inward_date': { $gte: start, $lte: end } } },
      { $group: { _id: '$item_name' } },
    ]);
    const fromSmoking = await issues_for_smoking_dying_model.aggregate([
      { $match: { issued_from: issues_for_status.veneer, createdAt: { $gte: start, $lte: end }, ...itemFilter } },
      { $group: { _id: '$item_name' } },
    ]);
    const fromGrouping = await issues_for_grouping_model.aggregate([
      { $match: { issued_from: issues_for_status.veneer, createdAt: { $gte: start, $lte: end }, ...itemFilter } },
      { $group: { _id: '$item_name' } },
    ]);

    const itemNames = new Set();
    [...fromVeneerItems, ...fromSmoking, ...fromGrouping].forEach((r) => {
      if (r._id) itemNames.add(r._id);
    });
    const items = Array.from(itemNames).sort();

    if (items.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, 'No veneer data found for the selected criteria')
        );
    }

    // Batch aggregations by item_name (all items in one go)
    const matchItem = items.length === 1 ? { item_name: items[0] } : { item_name: { $in: items } };
    const matchItemAndFilter = { ...matchItem, ...itemFilter };

    // Opening: veneer items whose invoice inward_date < start; sum total_sq_meter (approximation: current value for items inwards before start)
    const openingAgg = await veneer_inventory_items_model.aggregate([
      { $match: { deleted_at: null } },
      { $lookup: { from: 'veneer_inventory_invoice_details', localField: 'invoice_id', foreignField: '_id', as: 'inv' } },
      { $unwind: '$inv' },
      { $match: { 'inv.inward_date': { $lt: start }, ...matchItemAndFilter } },
      { $group: { _id: '$item_name', total: { $sum: '$total_sq_meter' } } },
    ]);
    const openingMap = new Map(openingAgg.map((o) => [o._id, o.total || 0]));

    // Purchase: all inward types (inventory, job_work, challan), inward_date in [start, end]
    const purchaseAgg = await veneer_inventory_items_model.aggregate([
      { $match: { deleted_at: null } },
      { $lookup: { from: 'veneer_inventory_invoice_details', localField: 'invoice_id', foreignField: '_id', as: 'inv' } },
      { $unwind: '$inv' },
      {
        $match: {
          'inv.inward_date': { $gte: start, $lte: end },
          ...matchItemAndFilter,
        },
      },
      { $group: { _id: '$item_name', total: { $sum: '$total_sq_meter' } } },
    ]);
    const purchaseMap = new Map(purchaseAgg.map((p) => [p._id, p.total || 0]));

    // Issue to Smoke: issues_for_smoking_dying veneer, createdAt in period
    const issueToSmokeAgg = await issues_for_smoking_dying_model.aggregate([
      {
        $match: {
          issued_from: issues_for_status.veneer,
          createdAt: { $gte: start, $lte: end },
          ...matchItemAndFilter,
        },
      },
      { $group: { _id: '$item_name', total: { $sum: '$sqm' } } },
    ]);
    const issueToSmokeMap = new Map(issueToSmokeAgg.map((s) => [s._id, s.total || 0]));

    // Smoke Done: process_done with process_done_date in period, from veneer (via issue_for_smoking_dying)
    const smokeDoneAgg = await process_done_items_details_model.aggregate([
      { $lookup: { from: 'process_done_details', localField: 'process_done_id', foreignField: '_id', as: 'pd' } },
      { $unwind: '$pd' },
      { $match: { 'pd.process_done_date': { $gte: start, $lte: end } } },
      { $lookup: { from: 'issues_for_smoking_dyings', localField: 'issue_for_smoking_dying_id', foreignField: '_id', as: 'iss' } },
      { $unwind: '$iss' },
      { $match: { 'iss.issued_from': issues_for_status.veneer, ...matchItemAndFilter } },
      { $group: { _id: '$item_name', total: { $sum: '$sqm' } } },
    ]);
    const smokeDoneMap = new Map(smokeDoneAgg.map((s) => [s._id, s.total || 0]));

    // Issue to group: issues_for_grouping veneer, createdAt in period
    const issueToGroupAgg = await issues_for_grouping_model.aggregate([
      {
        $match: {
          issued_from: issues_for_status.veneer,
          createdAt: { $gte: start, $lte: end },
          ...matchItemAndFilter,
        },
      },
      { $group: { _id: '$item_name', total: { $sum: '$sqm' } } },
    ]);
    const issueToGroupMap = new Map(issueToGroupAgg.map((g) => [g._id, g.total || 0]));

    // Group Done: grouping_done_details with grouping_done_date in period, from veneer
    const groupDoneAgg = await grouping_done_items_details_model.aggregate([
      { $lookup: { from: 'grouping_done_details', localField: 'grouping_done_other_details_id', foreignField: '_id', as: 'gd' } },
      { $unwind: '$gd' },
      { $match: { 'gd.grouping_done_date': { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'issues_for_groupings',
          localField: 'gd.issue_for_grouping_unique_identifier',
          foreignField: 'unique_identifier',
          as: 'iss',
        },
      },
      { $unwind: '$iss' },
      { $match: { 'iss.issued_from': issues_for_status.veneer, ...matchItemAndFilter } },
      { $group: { _id: '$item_name', total: { $sum: '$sqm' } } },
    ]);
    const groupDoneMap = new Map(groupDoneAgg.map((g) => [g._id, g.total || 0]));

    // Sales: veneer items issue_status order, updatedAt in period
    const salesAgg = await veneer_inventory_items_model.aggregate([
      {
        $match: {
          issue_status: issues_for_status.order,
          updatedAt: { $gte: start, $lte: end },
          deleted_at: null,
          ...matchItemAndFilter,
        },
      },
      { $group: { _id: '$item_name', total: { $sum: '$total_sq_meter' } } },
    ]);
    const salesMap = new Map(salesAgg.map((s) => [s._id, s.total || 0]));

    // Job Work Challan: issued to challan (from veneer history)
    const jobWorkChallanAgg =
      await veneer_inventory_items_view_modal.aggregate([
        {
          $match: {
            issue_status: issues_for_status.challan,
            updatedAt: { $gte: start, $lte: end },
            ...matchItemAndFilter,
          },
        },
        { $group: { _id: '$item_name', total: { $sum: '$total_sq_meter' } } },
      ]);
    const jobWorkChallanMap = new Map(jobWorkChallanAgg.map((j) => [j._id, j.total || 0]));

    // Damage: grouping_done_items_details is_damaged true, from veneer
    const damageAgg = await grouping_done_items_details_model.aggregate([
      { $match: { is_damaged: true, ...matchItemAndFilter } },
      { $lookup: { from: 'grouping_done_details', localField: 'grouping_done_other_details_id', foreignField: '_id', as: 'gd' } },
      { $unwind: '$gd' },
      {
        $lookup: {
          from: 'issues_for_groupings',
          localField: 'gd.issue_for_grouping_unique_identifier',
          foreignField: 'unique_identifier',
          as: 'iss',
        },
      },
      { $unwind: '$iss' },
      { $match: { 'iss.issued_from': issues_for_status.veneer } },
      { $group: { _id: '$item_name', total: { $sum: '$sqm' } } },
    ]);
    const damageMap = new Map(damageAgg.map((d) => [d._id, d.total || 0]));

    // Issue Total = Issue to Smoke + Issue to group + Sales (outflows in period)
    const rows = items.map((item_name) => {
      const opening = openingMap.get(item_name) ?? 0;
      const purchase = purchaseMap.get(item_name) ?? 0;
      const issue_to_smoke = issueToSmokeMap.get(item_name) ?? 0;
      const smoke_done = smokeDoneMap.get(item_name) ?? 0;
      const issue_to_group = issueToGroupMap.get(item_name) ?? 0;
      const group_done = groupDoneMap.get(item_name) ?? 0;
      const sales = salesMap.get(item_name) ?? 0;
      const job_work_challan = jobWorkChallanMap.get(item_name) ?? 0;
      const damage = damageMap.get(item_name) ?? 0;
      const issue_total = issue_to_smoke + issue_to_group + sales;
      const closing = Math.max(0, opening + purchase - issue_total - damage);

      return {
        item_name,
        opening,
        purchase,
        issue_total,
        issue_to_smoke,
        smoke_done,
        issue_to_group,
        group_done,
        sales,
        job_work_challan,
        damage,
        closing,
      };
    });

    const excelLink = await createVeneerInwardReportExcel(rows, startDate, endDate, filter);

    return res.json(
      new ApiResponse(200, 'Veneer inward report generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating veneer inward report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
