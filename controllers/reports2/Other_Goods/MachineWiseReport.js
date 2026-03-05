import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { othergoods_inventory_items_details } from '../../../database/schema/inventory/otherGoods/otherGoodsNew.schema.js';
import OtherGoodsModel from '../../../database/schema/inventory/otherGoods/otherGoods.schema.js';
import { OtherGoodsMachineWiseReportExcel as createMachineWiseReportExcelConfig } from '../../../config/downloadExcel/reports2/Other_Goods/machineWiseReport.js';

/**
 * Machine Wise Report for Other Goods
 * Generates an Excel report of other goods assigned to machines
 * 
 * @route POST /api/V1/reports2/download-excel-machine-wise-report
 * @access Private
 */
export const OtherGoodsMachineWiseReportExcel = catchAsync(async (req, res, next) => {
    const { startDate, endDate, filter = {} } = req.body;

    // Validate required parameters
    if (!startDate || !endDate) {
        return next(new ApiError('Start date and end date are required', 400));
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
    }

    try {
        // Build match query for items assigned to machines
        const matchQuery = {
            'invoice.inward_date': { $gte: start, $lte: end }
        };

        if (filter.machine_id) {
            matchQuery.machine_id = filter.machine_id;
        }

        // Fetch items assignment with invoice details and category-based units
        const reportData = await othergoods_inventory_items_details.aggregate([
            {
                $lookup: {
                    from: 'othergoods_inventory_invoice_details',
                    localField: 'invoice_id',
                    foreignField: '_id',
                    as: 'invoice'
                }
            },
            {
                $unwind: '$invoice'
            },
            {
                $match: matchQuery
            },
            {
                // Join with item_subcategory to get category reference
                $addFields: {
                    sub_cat_oid: { $toObjectId: '$item_sub_category_id' }
                }
            },
            {
                $lookup: {
                    from: 'item_subcategories',
                    localField: 'sub_cat_oid',
                    foreignField: '_id',
                    as: 'subcategory'
                }
            },
            {
                $unwind: {
                    path: '$subcategory',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                // Join with item_category to get calculate_unit
                // Note: subcategory.category is an array [ObjectId]
                $unwind: {
                    path: '$subcategory.category',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'item_categories',
                    localField: 'subcategory.category',
                    foreignField: '_id',
                    as: 'category_data'
                }
            },
            {
                $unwind: {
                    path: '$category_data',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    machine: { $ifNull: ['$machine_name', 'N/A'] },
                    item: '$item_name',
                    qty: { $ifNull: ['$total_quantity', 0] },
                    unit: { $ifNull: ['$category_data.calculate_unit', '-'] },
                    amt: { $ifNull: ['$amount', 0] }
                }
            },
            {
                $sort: { machine: 1, item: 1 }
            }
        ]);

        if (reportData.length === 0) {
            return res
                .status(404)
                .json(
                    new ApiResponse(
                        404,
                        'No other goods data found for the selected period'
                    )
                );
        }

        // Generate Excel file
        const excelLink = await createMachineWiseReportExcelConfig(
            reportData,
            startDate,
            endDate,
            filter
        );

        return res.json(
            new ApiResponse(
                200,
                'Machine wise other goods report generated successfully',
                excelLink
            )
        );
    } catch (error) {
        console.error('Error generating machine wise report:', error);
        return next(
            new ApiError(error.message || 'Failed to generate report', 500)
        );
    }
});
