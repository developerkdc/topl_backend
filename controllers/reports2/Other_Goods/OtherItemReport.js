import {
    othergoods_inventory_items_details,
} from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import other_goods_history_model from '../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';
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
        // 1. Get all unique items that had any activity or have current stock
        // We'll group by item_name to get a consolidated list
        const items = await othergoods_inventory_items_details.distinct('item_name', { deleted_at: null });

        const reportData = await Promise.all(items.map(async (itemName) => {
            // --- PURCHASE (Inward between start and end) ---
            const purchases = await othergoods_inventory_items_details.aggregate([
                {
                    $match: {
                        item_name: itemName,
                        deleted_at: null
                    }
                },
                {
                    $lookup: {
                        from: 'othergoods_inventory_invoice_details',
                        localField: 'invoice_id',
                        foreignField: '_id',
                        as: 'invoice'
                    }
                },
                { $unwind: '$invoice' },
                {
                    $match: {
                        'invoice.inward_date': { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        qty: { $sum: '$total_quantity' }
                    }
                }
            ]);

            // --- ISSUED FOR ORDER (Consumption between start and end) ---
            const issues = await other_goods_history_model.aggregate([
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
                        'item.item_name': itemName,
                        issue_status: 'order',
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        qty: { $sum: '$issued_quantity' }
                    }
                }
            ]);

            // --- SALES (Challan between start and end) ---
            const sales = await other_goods_history_model.aggregate([
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
                        'item.item_name': itemName,
                        issue_status: 'challan',
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        qty: { $sum: '$issued_quantity' }
                    }
                }
            ]);

            // --- OPENING STOCK (Total Inward before start - Total Outward before start) ---
            const totalInwardBefore = await othergoods_inventory_items_details.aggregate([
                { $match: { item_name: itemName, deleted_at: null } },
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
                {
                    $group: {
                        _id: null,
                        qty: { $sum: '$total_quantity' }
                    }
                }
            ]);

            const totalOutwardBefore = await other_goods_history_model.aggregate([
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
                        'item.item_name': itemName,
                        createdAt: { $lt: start }
                    }
                },
                {
                    $group: {
                        _id: null,
                        qty: { $sum: '$issued_quantity' }
                    }
                }
            ]);

            const inBeforeQty = totalInwardBefore[0]?.qty || 0;
            const outBeforeQty = totalOutwardBefore[0]?.qty || 0;

            const openingQty = Math.max(0, inBeforeQty - outBeforeQty);

            const purchaseQty = purchases[0]?.qty || 0;
            const issueQty = issues[0]?.qty || 0;
            const salesQty = sales[0]?.qty || 0;
            const damageQty = 0; // Placeholder

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
        }));

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
