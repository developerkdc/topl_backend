import {
    othergoods_inventory_items_details,
} from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import other_goods_history_model from '../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';
import dispatchItemsModel from '../../../database/schema/dispatch/dispatch_items.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import { OtherItemSummaryReportExcel } from '../../../config/downloadExcel/reports2/Other_Goods/otherItemReport.js';

/**
 * Controller for Other Item Summary Report
 * Calculates Opening, Purchase, Issue, Sales, Damage, and Closing (Qty & Value)
 */
export const OtherItemReportExcel = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return next(new ApiError('Start date and end date are required', StatusCodes.BAD_REQUEST));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new ApiError('Invalid date format', StatusCodes.BAD_REQUEST));
    }

    try {
        // 1. Get all unique item names
        const items = await othergoods_inventory_items_details.distinct('item_name', { deleted_at: null });

        // 2. Fetch all movements in bulk for the period

        // --- PURCHASES Map ---
        const purchasesRaw = await othergoods_inventory_items_details.aggregate([
            { $match: { deleted_at: null } },
            {
                $lookup: {
                    from: 'othergoods_inventory_invoice_details',
                    localField: 'invoice_id',
                    foreignField: '_id',
                    as: 'invoice'
                }
            },
            { $unwind: '$invoice' },
            { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
            { $group: { _id: '$item_name', qty: { $sum: '$total_quantity' } } }
        ]);
        const purchaseMap = new Map(purchasesRaw.map(p => [p._id, p.qty]));

        // --- ISSUES Map ---
        const issuesRaw = await other_goods_history_model.aggregate([
            {
                $lookup: {
                    from: 'othergoods_inventory_items_details',
                    localField: 'other_goods_item_id',
                    foreignField: '_id',
                    as: 'item'
                }
            },
            { $unwind: '$item' },
            {
                $match: {
                    issue_status: { $in: ['order', 'consume'] },
                    createdAt: { $gte: start, $lte: end }
                }
            },
            { $group: { _id: '$item.item_name', qty: { $sum: '$issued_quantity' } } }
        ]);
        const issueMap = new Map(issuesRaw.map(i => [i._id, i.qty]));

        // --- SALES Map (Dispatch) ---
        const salesRaw = await dispatchItemsModel.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$item_name',
                    qty: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$quantity', 0] },
                                { $ifNull: ['$no_of_sheets', 0] },
                                { $ifNull: ['$no_of_leaves', 0] },
                                { $ifNull: ['$number_of_rolls', 0] }
                            ]
                        }
                    }
                }
            }
        ]);
        const salesMap = new Map(salesRaw.map(s => [s._id, s.qty]));

        // --- OPENING BALANCES ---
        const inBeforeRaw = await othergoods_inventory_items_details.aggregate([
            { $match: { deleted_at: null } },
            {
                $lookup: {
                    from: 'othergoods_inventory_invoice_details',
                    localField: 'invoice_id',
                    foreignField: '_id',
                    as: 'invoice'
                }
            },
            { $unwind: '$invoice' },
            { $match: { 'invoice.inward_date': { $lt: start } } },
            { $group: { _id: '$item_name', qty: { $sum: '$total_quantity' } } }
        ]);
        const inBeforeMap = new Map(inBeforeRaw.map(i => [i._id, i.qty]));

        const issuedBeforeRaw = await other_goods_history_model.aggregate([
            {
                $lookup: {
                    from: 'othergoods_inventory_items_details',
                    localField: 'other_goods_item_id',
                    foreignField: '_id',
                    as: 'item'
                }
            },
            { $unwind: '$item' },
            {
                $match: {
                    issue_status: { $in: ['order', 'consume'] },
                    createdAt: { $lt: start }
                }
            },
            { $group: { _id: '$item.item_name', qty: { $sum: '$issued_quantity' } } }
        ]);
        const issuedBeforeMap = new Map(issuedBeforeRaw.map(i => [i._id, i.qty]));

        const dispatchedBeforeRaw = await dispatchItemsModel.aggregate([
            { $match: { createdAt: { $lt: start } } },
            {
                $group: {
                    _id: '$item_name',
                    qty: {
                        $sum: {
                            $add: [
                                { $ifNull: ['$quantity', 0] },
                                { $ifNull: ['$no_of_sheets', 0] },
                                { $ifNull: ['$no_of_leaves', 0] },
                                { $ifNull: ['$number_of_rolls', 0] }
                            ]
                        }
                    }
                }
            }
        ]);
        const dispatchedBeforeMap = new Map(dispatchedBeforeRaw.map(d => [d._id, d.qty]));

        // 3. Construct Final Data
        const reportData = items.map(itemName => {
            const openingIn = inBeforeMap.get(itemName) || 0;
            const openingOut = (issuedBeforeMap.get(itemName) || 0) + (dispatchedBeforeMap.get(itemName) || 0);
            const openingQty = Math.max(0, openingIn - openingOut);

            const purchaseQty = purchaseMap.get(itemName) || 0;
            const issueQty = issueMap.get(itemName) || 0;
            const salesQty = salesMap.get(itemName) || 0;
            const damageQty = 0;

            const closingQty = openingQty + purchaseQty - (issueQty + salesQty + damageQty);

            return {
                item_name: itemName,
                opening_qty: openingQty,
                purchase_qty: purchaseQty,
                issue_qty: issueQty,
                sales_qty: salesQty,
                damage_qty: damageQty,
                closing_qty: Math.max(0, closingQty)
            };
        });

        // Filter out items with no activity in the period and no opening stock
        const filteredReportData = reportData.filter(item =>
            item.opening_qty > 0 ||
            item.purchase_qty > 0 ||
            item.issue_qty > 0 ||
            item.sales_qty > 0
        );

        if (filteredReportData.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(
                new ApiResponse(StatusCodes.NOT_FOUND, 'No inventory activity found for the selected period')
            );
        }

        // Generate Excel
        const excelLink = await OtherItemSummaryReportExcel(filteredReportData, startDate, endDate);

        return res.status(StatusCodes.OK).json(
            new ApiResponse(StatusCodes.OK, 'Other Item Summary Report generated successfully', excelLink)
        );

    } catch (error) {
        console.error('Report Generation Error:', error);
        return next(new ApiError(`Failed to generate Other Item Summary Report: ${error.message}`, 500));
    }
});
