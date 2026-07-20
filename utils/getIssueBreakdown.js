import { decorative_order_item_details_model } from '../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import { order_item_status, order_status } from '../database/Utils/constants/constants.js';
import series_product_order_item_details_model from '../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import photoModel from '../database/schema/masters/photo.schema.js';
import { StatusCodes } from './constants.js';
import ApiError from './errors/apiError.js';
import { grouping_done_items_details_model } from '../database/schema/factory/grouping/grouping_done.schema.js';
import { tapping_done_items_details_model } from '../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { pressing_done_consumed_items_details_model } from '../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';

const buildReservationPipeline = (photo_no_id) => [
    {
        $match: {
            $or: [
                { photo_number_id: photo_no_id },
                { different_group_photo_number_id: photo_no_id },
            ],
            item_status: { $nin: [order_item_status.cancelled, order_item_status.closed] },
        },
    },
    {
        $lookup: {
            from: 'orders',
            localField: 'order_id',
            foreignField: '_id',
            as: 'order_info',
            pipeline: [{ $project: { order_status: 1 } }],
        },
    },
    { $unwind: { path: '$order_info', preserveNullAndEmptyArrays: true } },
    { $match: { 'order_info.order_status': { $nin: [order_status.closed, order_status.cancelled] } } },
    {
        $addFields: {
            reserved_sheets: {
                $cond: [
                    { $eq: ['$pressing_instructions', 'BOTH SIDE WITH SAME GROUP'] },
                    { $multiply: ['$no_of_sheets', 2] },
                    '$no_of_sheets',
                ],
            },
        },
    },
    { $group: { _id: null, total_sheets: { $sum: '$reserved_sheets' } } },
];

const getPhotoReservedSheets = async (photo_no_id) => {
    if (!photo_no_id) return 0;

    const [decorative_result, series_result] = await Promise.all([
        decorative_order_item_details_model.aggregate(buildReservationPipeline(photo_no_id)),
        series_product_order_item_details_model.aggregate(buildReservationPipeline(photo_no_id)),
    ]);

    const decorative_total = decorative_result?.[0]?.total_sheets || 0;
    const series_total = series_result?.[0]?.total_sheets || 0;

    return decorative_total + series_total;
};

const resolvePhotoNoId = async (item_details) => {
    if (item_details?.photo_no_id) {
        return item_details.photo_no_id;
    }
    if (item_details?.group_number) {
        const grouping_item = await grouping_done_items_details_model
            .findOne({ group_number: item_details.group_number })
            .select('photo_no_id')
            .lean();
        return grouping_item?.photo_no_id || null;
    }
    return null;
};

export const getIssueBreakdownForItem = async ({
    itemModel,
    itemId,
    historyModel = null,
    historyMatchField = null,
}) => {
    const item_details = await itemModel.findById(itemId).lean();

    if (!item_details) {
        throw new ApiError('Item details not found', StatusCodes.NOT_FOUND);
    }

    const photo_no_id = await resolvePhotoNoId(item_details);

    const photo_info = await photoModel
        .findById(photo_no_id)
        .select('no_of_sheets available_no_of_sheets photo_number')
        .lean();

    let breakdown = [];
    if (historyModel && historyMatchField) {
        breakdown = await historyModel.aggregate([
            { $match: { [historyMatchField]: item_details._id } },
            {
                $group: {
                    _id: '$issued_for',
                    total_sheets: { $sum: '$no_of_sheets' },
                    total_amount: { $sum: '$amount' },
                    records: {
                        $push: {
                            no_of_sheets: '$no_of_sheets',
                            sqm: '$sqm',
                            issued_date: '$createdAt',
                            order_id: '$order_id',
                            order_item_id: '$order_item_id',
                            order_category: '$order_category',
                        },
                    },
                },
            },
        ]);
    }

    const reserved_for_order_sheets = await getPhotoReservedSheets(photo_no_id);

    return {
        available_sheets: item_details?.available_details?.no_of_sheets ?? 0,
        group_total_sheets: photo_info?.no_of_sheets ?? null,
        group_available_sheets: photo_info?.available_no_of_sheets ?? null,
        reserved_for_order_sheets,
        issued_sample_sheets: breakdown.find((b) => b._id === 'SAMPLE')?.total_sheets || 0,
        issued_stock_sheets: breakdown.find((b) => b._id === 'STOCK')?.total_sheets || 0,
        issued_order_sheets: breakdown.find((b) => b._id === 'ORDER')?.total_sheets || 0,
    };
};

export const resolvePhotoNoIdFromGroupNo = async (group_number) => {
    if (!group_number) return null;

    const grouping_item = await grouping_done_items_details_model
        .findOne({ group_number })
        .select('photo_no_id')
        .lean();

    return grouping_item?.photo_no_id || null;
};

const buildReservationPipeline2 = (group_number) => [
    {
        $match: {
            $or: [
                { group_number: group_number },
                { different_group_number: group_number },
            ],
            item_status: { $nin: [order_item_status.cancelled, order_item_status.closed] },
        },
    },
    {
        $lookup: {
            from: 'orders',
            localField: 'order_id',
            foreignField: '_id',
            as: 'order_info',
            pipeline: [{ $project: { order_no: 1, order_status: 1, owner_name: 1 } }],
        },
    },
    { $unwind: { path: '$order_info', preserveNullAndEmptyArrays: true } },
    { $match: { 'order_info.order_status': { $nin: [order_status.closed, order_status.cancelled] } } },
    {
        $addFields: {
            reserved_sheets: {
                $cond: [
                    { $eq: ['$pressing_instructions', 'BOTH SIDE WITH SAME GROUP'] },
                    { $multiply: ['$no_of_sheets', 2] },
                    '$no_of_sheets',
                ],
            },
        },
    },
    {
        $group: {
            _id: '$order_id',
            order_no: { $first: '$order_info.order_no' },
            owner_name: { $first: '$order_info.owner_name' },
            reserved_sheets: { $sum: '$reserved_sheets' },
            order_item_ids: { $push: '$_id' },
        },
    },
];


export const getReservedOrdersForPhoto = async (photo_no_id) => {
    if (!photo_no_id) return [];

    const [decorative_orders, series_orders] = await Promise.all([
        decorative_order_item_details_model.aggregate(buildReservationPipeline2(photo_no_id)),
        series_product_order_item_details_model.aggregate(buildReservationPipeline2(photo_no_id)),
    ]);

    return [
        ...decorative_orders.map((o) => ({ ...o, order_category: 'DECORATIVE' })),
        ...series_orders.map((o) => ({ ...o, order_category: 'SERIES' })),
    ];
};

export const getReservedOrdersForGroupNo = async (group_number) => {
    if (!group_number) return [];

    const [decorative_orders, series_orders] = await Promise.all([
        decorative_order_item_details_model.aggregate(buildReservationPipeline2(group_number)),
        series_product_order_item_details_model.aggregate(buildReservationPipeline2(group_number)),
    ]);

    return [
        ...decorative_orders.map((o) => ({ ...o, order_category: 'DECORATIVE' })),
        ...series_orders.map((o) => ({ ...o, order_category: 'SERIES' })),
    ];
};

// export const fetch_reserved_orders_for_item = catchAsync(async (req, res, next) => {
//     const { module: moduleName, id } = req.params;

//     const itemModel = ITEM_MODEL_MAP[moduleName?.toLowerCase()];
//     if (!itemModel) {
//         throw new ApiError(
//             `Invalid module '${moduleName}'. Must be one of: ${Object.keys(ITEM_MODEL_MAP).join(', ')}`,
//             StatusCodes.BAD_REQUEST
//         );
//     }

//     if (!id || !mongoose.isValidObjectId(id)) {
//         throw new ApiError('Invalid item id', StatusCodes.BAD_REQUEST);
//     }

//     const item_details = await itemModel.findById(id).select('group_number').lean();
//     if (!item_details) {
//         throw new ApiError('Item not found', StatusCodes.NOT_FOUND);
//     }

//     const reserved_orders = await getReservedOrdersForGroupNo(item_details.group_number);

//     return res.status(StatusCodes.OK).json(
//         new ApiResponse(StatusCodes.OK, 'Reserved orders fetched', reserved_orders)
//     );
// });