import mongoose, { isValidObjectId } from 'mongoose';
import { issues_for_pressing_model } from '../../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import {
  tapping_done_items_details_model,
  tapping_done_other_details_model,
} from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import {
  issues_for_status,
  order_category,
} from '../../../../database/Utils/constants/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { OrderModel } from '../../../../database/schema/order/orders.schema.js';
import { pressing_damage_model } from '../../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import { pressing_done_details_model } from '../../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';

const order_items_collections = {
  [order_category.decorative]: 'decorative_order_item_details',
  [order_category.series_product]: 'series_product_order_item_details',
};

export const list_pressing_damage = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sort = 'desc',
    search = '',
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  const aggGroupNoLookup = {
    $lookup: {
      from: 'grouping_done_items_details',
      localField: 'pressing_done_details.group_no',
      foreignField: 'group_no',
      pipeline: [
        {
          $project: {
            group_no: 1,
            photo_no: 1,
            photo_id: 1,
          },
        },
      ],
      as: 'grouping_done_items_details',
    },
  };
  const aggGroupNoUnwind = {
    $unwind: {
      path: '$grouping_done_items_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggPressingDoneLookup = {
    $lookup: {
      from: 'pressing_done_details',
      localField: 'pressing_done_details_id',
      foreignField: '_id',
      as: 'pressing_done_details',
    },
  };
  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'created_by',
    },
  };
  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'updated_by',
    },
  };
  const aggPressingDoneUnwind = {
    $unwind: {
      path: '$pressing_done_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggCreatedByUnwind = {
    $unwind: {
      path: '$created_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUpdatedByUnwind = {
    $unwind: {
      path: '$updated_by',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggOrderRelatedData = [
    {
      $lookup: {
        from: 'orders',
        localField: 'pressing_done_details.order_id',
        pipeline: [
          {
            $project: {
              order_no: 1,
              owner_name: 1,
              orderDate: 1,
              order_category: 1,
              series_product: 1,
            },
          },
        ],
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'series_product_order_item_details',
        localField: 'pressing_done_details.order_item_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              group_no: 1,
              photo_number: 1,
            },
          },
        ],
        as: 'series_product_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$series_product_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'decorative_order_item_details',
        localField: 'pressing_done_details.order_item_id',
        pipeline: [
          {
            $project: {
              item_no: 1,
              order_id: 1,
              item_name: 1,
              item_sub_category_name: 1,
              group_no: 1,
              photo_number: 1,
            },
          },
        ],
        foreignField: '_id',
        as: 'decorative_order_item_details',
      },
    },
    {
      $unwind: {
        path: '$decorative_order_item_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        order_item_details: {
          $cond: {
            if: {
              $ne: [{ $type: '$decorative_order_item_details' }, 'missing'],
            },
            then: '$decorative_order_item_details',
            else: '$series_product_order_item_details',
          },
        },
      },
    },
  ];
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggSort = {
    $sort: {
      [sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggPressingDoneLookup,
    aggPressingDoneUnwind,
    aggGroupNoLookup,
    aggGroupNoUnwind,
    ...aggOrderRelatedData,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const pressing_damage_list =
    await pressing_damage_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const totalDocument = await pressing_damage_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    200,
    'Pressing damage Data Fetched Successfully',
    {
      data: pressing_damage_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

export const revert_pressing_damage = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;

  const { id } = req.params;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const pressing_damage_details = await pressing_damage_model
      .findById(id)
      .lean()
      .session(session);
    if (!pressing_damage_details) {
      throw new ApiError(
        'Pressing Damage details not found',
        StatusCodes.NOT_FOUND
      );
    }

    const delete_damage_data_result = await pressing_damage_model.deleteOne(
      { _id: id },
      { session }
    );

    if (
      !delete_damage_data_result.acknowledged ||
      delete_damage_data_result.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete damage data',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_pressing_done_details_result =
      await pressing_done_details_model.findOneAndUpdate(
        { _id: pressing_damage_details?.pressing_done_details_id },
        {
          $inc: {
            'available_details.no_of_sheets':
              pressing_damage_details.no_of_sheets,
            'available_details.sqm': pressing_damage_details.sqm,
          },
        },
        { session }
      );

    if (!update_pressing_done_details_result) {
      throw new ApiError(
        'Failed to update pressing done details',
        StatusCodes.BAD_REQUEST
      );
    }

    const is_item_editable = await pressing_done_details_model
      .findById(pressing_damage_details?.pressing_done_details_id)
      .lean()
      .session(session);

    if (
      is_item_editable?.no_of_sheets ===
      is_item_editable?.available_details?.no_of_sheets
    ) {
      await pressing_done_details_model.updateOne(
        { _id: is_item_editable?._id },
        {
          $set: {
            isEditable: true,
          },
        },
        { session }
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Item Reverted Successfully'
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
