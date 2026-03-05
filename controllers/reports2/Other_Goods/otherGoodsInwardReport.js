import { GenerateOtherGoodsInwardReport } from '../../../config/downloadExcel/reports2/Other_Goods/otherGoodsInward.js';
import { othergoods_inventory_items_view_modal } from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Other Goods Inward Report – Excel download.
 * Returns opening, receive, consume, sales, issue for pressing, closing (sheets + sqm).
 *
 * @route POST /report/download-other-goods-inward-report
 * @access Private
 */
export const otherGoodsInwardReportExcel = catchAsync(
    async (req, res, next) => {
        // Debug logging
        // console.log('otherGoods Inward Report - Request Body:', JSON.stringify(req.body, null, 2));
        // console.log('otherGoods Inward Report - Filters:', req.body);

        const { startDate, endDate, ...data } = req?.body || {};
        let targetStart = startDate;
        let targetEnd = endDate;

        if (!targetStart || !targetEnd) {
            return res.status(400).json({
                statusCode: 400,
                status: 'error',
                message: 'Start date and End date are required',
            });
        }

        const start = new Date(targetStart);
        start.setHours(0, 0, 0, 0);

        const end = new Date(targetEnd);
        end.setHours(23, 59, 59, 999);

        const matchQuery = {
            'othergoods_invoice_details.inward_date': {
                $gte: start,
                $lte: end,
            },
        };

        // Build aggregation pipeline
        const otherGoodsData = await othergoods_inventory_items_view_modal.aggregate([
            {
                $match: matchQuery,
            },
            {
                $addFields: {
                    // Convert String ID to ObjectId for lookup
                    item_sub_category_id: { $toObjectId: '$item_sub_category_id' },
                },
            },
            {
                $lookup: {
                    from: 'item_subcategories',
                    localField: 'item_sub_category_id',
                    foreignField: '_id',
                    as: 'subcategory_info',
                },
            },
            {
                $unwind: {
                    path: '$subcategory_info',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    first_category_id: { $arrayElemAt: ['$subcategory_info.category', 0] },
                },
            },
            {
                $lookup: {
                    from: 'item_categories',
                    localField: 'first_category_id',
                    foreignField: '_id',
                    as: 'category_info',
                },
            },
            {
                $unwind: {
                    path: '$category_info',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    unit: { $ifNull: ['$category_info.calculate_unit', ''] },
                    cgst_value: {
                        $divide: [
                            { $multiply: ['$amount', { $ifNull: ['$othergoods_invoice_details.invoice_Details.cgst_percentage', 0] }] },
                            100
                        ]
                    },
                    sgst_value: {
                        $divide: [
                            { $multiply: ['$amount', { $ifNull: ['$othergoods_invoice_details.invoice_Details.sgst_percentage', 0] }] },
                            100
                        ]
                    },
                    igst_value: {
                        $divide: [
                            { $multiply: ['$amount', { $ifNull: ['$othergoods_invoice_details.invoice_Details.igst_percentage', 0] }] },
                            100
                        ]
                    },
                },
            },
            {
                $sort: {
                    item_name: 1,
                    item_sr_no: 1,
                    'othergoods_invoice_details.invoice_Details.invoice_no': 1,
                },
            },
        ]);

        console.log('OtherGoods Inward Report - Records found:', otherGoodsData.length);

        // Check if data exists
        if (!otherGoodsData || otherGoodsData.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                status: 'error',
                message: 'No Store inward data found for the selected date range',
            });
        }

        // Generate Excel report
        const excelLink = await GenerateOtherGoodsInwardReport(
            otherGoodsData,
            targetStart,
            targetEnd
        );

        return res.status(200).json({
            result: excelLink,
            statusCode: 200,
            status: 'success',
            message: 'Other Goods inward report generated successfully',
        });
    }
);
