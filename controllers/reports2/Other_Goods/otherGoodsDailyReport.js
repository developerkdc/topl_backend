import { GenerateOtherGoodsDailyReport } from '../../../config/downloadExcel/reports2/Other_Goods/otherGoodsDaily.js';
import { othergoods_inventory_items_view_modal } from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Other Goods Daily Report – Excel download.
 * Uses reportDate and optional filter (item_sub_category_name).
 * Returns opening, receive, consume, sales, issue for pressing, closing (sheets + sqm).
 *
 * @route POST /report/download-other-goods-daily-report
 * @access Private
 */
export const otherGoodsDailyReportExcel = catchAsync(
    async (req, res, next) => {
        // Debug logging
        // console.log('otherGoods Daily Report - Request Body:', JSON.stringify(req.body, null, 2));
        // console.log('otherGoods Daily Report - Filters:', req.body?.filters);

        const { reportDate, ...data } = req?.body?.filters || {};

        // Validate reportDate
        if (!reportDate) {
            console.log('OtherGoods Daily Report - ERROR: No reportDate found');
            return res.status(400).json({
                statusCode: 400,
                status: 'error',
                message: 'Report date is required',
            });
        }

        // Set up date filter for the specific day
        const startOfDay = new Date(reportDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(reportDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('OtherGoods Daily Report - Date:', reportDate);
        console.log('OtherGoods Daily Report - Start:', startOfDay);
        console.log('OtherGoods Daily Report - End:', endOfDay);

        // Build match query
        const matchQuery = {
            'othergoods_invoice_details.inward_date': {
                $gte: startOfDay,
                $lte: endOfDay,
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

        console.log('OtherGoods Daily Report - Records found:', otherGoodsData.length);

        // Check if data exists
        if (!otherGoodsData || otherGoodsData.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                status: 'error',
                message: 'No Store daily data found for the selected date',
            });
        }

        // Generate Excel report
        const excelLink = await GenerateOtherGoodsDailyReport(
            otherGoodsData,
            reportDate
        );

        return res.status(200).json({
            result: excelLink,
            statusCode: 200,
            status: 'success',
            message: 'Other Goods daily report generated successfully',
        });
    }
);
