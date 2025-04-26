import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import challan_done_model from '../../../database/schema/challan/challan_done/challan_done.schema.js';
import { isValidObjectId } from 'mongoose';
import { challan_status } from '../../../database/Utils/constants/constants.js';

export const create_challan = catchAsync(async (req, res) => {
  const { challan_details } = req.body;
  const userDetails = req.userDetails;

  if (!challan_details) {
    throw new ApiError(
      'Challan details are required.',
      StatusCodes.BAD_REQUEST
    );
  }

  if (!Array.isArray(challan_details?.raw_material_items)) {
    throw new ApiError(
      'Raw material items must be an array',
      StatusCodes.BAD_REQUEST
    );
  }
  if (challan_details?.raw_material_items?.length === 0) {
    throw new ApiError(
      'Raw material items array must have an item',
      StatusCodes.BAD_REQUEST
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const issued_for_challan_details = await issue_for_challan_model
      .find({ _id: { $in: challan_details?.raw_material_items } })
      .session(session);

    if (issued_for_challan_details?.length === 0) {
      throw new ApiError(
        'Issued for challan items not found.',
        StatusCodes.NOT_FOUND
      );
    }
    const updated_details = {
      ...challan_details,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const [create_challan_result] = await challan_done_model.create(
      [updated_details],
      { session }
    );

    if (!create_challan_result) {
      throw new ApiError('Failed to create challan.', StatusCodes.BAD_REQUEST);
    }

    const update_issue_for_challan_update_result =
      await issue_for_challan_model.updateMany(
        { _id: { $in: challan_details?.raw_material_items } },
        {
          $set: {
            is_challan_done: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_challan_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for challan details not found.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_issue_for_challan_update_result.acknowledged ||
      update_issue_for_challan_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issued for challan status',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Challan generated successfully',
      create_challan_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const listing_challan_done = catchAsync(async (req, res, next) => {
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

  const aggIssuedChallanDetailsLookup = {
    $lookup: {
      from: 'issue_for_challan_details',
      localField: 'raw_material_items',
      foreignField: '_id',
      as: 'issue_for_challan_item_details',
    },
  };
  const aggCustomerDetailsLookup = {
    $lookup: {
      from: 'customers',
      localField: 'customer_id',
      foreignField: '_id',
      as: 'customer_details',
    },
  };

  const aggTransporterLookup = {
    $lookup: {
      from: 'transporters',
      localField: 'transporter_id',
      foreignField: '_id',
      as: 'transporter_details',
    },
  };
  const aggVehicleLookup = {
    $lookup: {
      from: 'vehicles',
      localField: 'vehicle_id',
      foreignField: '_id',
      as: 'vehicle_details',
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
  const aggCustomerDetailsUnwind = {
    $unwind: {
      path: '$customer_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggTransporterDetailsUnwind = {
    $unwind: {
      path: '$transporter_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggVehiclesDetailsUnwind = {
    $unwind: {
      path: '$vehicle_details',
      preserveNullAndEmptyArrays: true,
    },
  };
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
    aggIssuedChallanDetailsLookup,
    aggCustomerDetailsLookup,
    aggCustomerDetailsUnwind,
    aggTransporterLookup,
    aggTransporterDetailsUnwind,
    aggVehicleLookup,
    aggVehiclesDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const issue_for_color = await challan_done_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const totalDocument = await challan_done_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Challan details fetched successfully',
    {
      data: issue_for_color,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

export const edit_challan_details = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { challan_details } = req.body;
  const userDetails = req.userDetails;

  if (!id) {
    throw new ApiError('ID is missing.', StatusCodes.NOT_FOUND);
  }
  if (!challan_details) {
    throw new ApiError('Challan details are required.', StatusCodes.NOT_FOUND);
  }

  if (!Array.isArray(challan_details?.raw_material_items)) {
    throw new ApiError(
      'Raw material items must be an array',
      StatusCodes.BAD_REQUEST
    );
  }
  if (challan_details?.raw_material_items?.length === 0) {
    throw new ApiError(
      'Raw material items array must have an item',
      StatusCodes.BAD_REQUEST
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const challan_done_details = await challan_done_model
      .findById(id)
      .session(session);
    if (!challan_done_details) {
      throw new ApiError(
        'Challan done details not found',
        StatusCodes.NOT_FOUND
      );
    }

    const update_existing_issue_for_challan_status_result =
      await issue_for_challan_model.updateMany(
        { _id: { $in: challan_done_details?.raw_material_items } },
        {
          $set: {
            is_challan_done: false,
          },
        },
        { session }
      );

    if (update_existing_issue_for_challan_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Failed to update issue for challan status',
        StatusCodes.BAD_REQUEST
      );
    }
    if (
      !update_existing_issue_for_challan_status_result?.acknowledged ||
      update_existing_issue_for_challan_status_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for challan status',
        StatusCodes.BAD_REQUEST
      );
    }
    const updated_details = {
      ...challan_details,
      updated_by: userDetails?._id,
    };

    const update_challan_details = await challan_done_model.updateOne(
      { _id: challan_done_details?._id },
      { $set: updated_details },
      { session }
    );

    if (
      !update_challan_details?.acknowledged ||
      update_challan_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update challan details.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_issue_for_challan_update_result =
      await issue_for_challan_model.updateMany(
        { _id: { $in: challan_details?.raw_material_items } },
        {
          $set: {
            is_challan_done: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_challan_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for challan details not found.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_issue_for_challan_update_result.acknowledged ||
      update_issue_for_challan_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issued for challan status',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Challan updated successfully.',
      update_challan_details
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


export const update_inward_challan_status_by_challan_id = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userDetails = req.userDetails;
  if (!id) {
    throw new ApiError("ID is missing.", StatusCodes.NOT_FOUND)
  };

  if (!isValidObjectId(id)) {
    throw new ApiError("Invalid ID", StatusCodes.BAD_REQUEST)
  };

  const update_status_result = await challan_done_model.updateOne({ _id: id }, {
    $set: {
      inward_challan_status: challan_status?.received,
      updated_by: userDetails?._id
    }
  });

  if (update_status_result?.matchedCount === 0) {
    throw new ApiError("Challan done item not found.", StatusCodes.NOT_FOUND)
  };
  if (!update_status_result?.acknowledged || update_status_result?.modifiedCount === 0) {
    throw new ApiError("Failed to update challan status.", StatusCodes.BAD_REQUEST)
  };
  const response = new ApiResponse(StatusCodes.OK, "Inward Challan received successfully");
  return res.status(StatusCodes.OK).json(response);
})