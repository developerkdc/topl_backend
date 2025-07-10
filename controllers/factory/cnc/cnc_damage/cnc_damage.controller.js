import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import cnc_damage_model from '../../../../database/schema/factory/cnc/cnc_damage/cnc_damage.schema.js';
import { cnc_done_details_model } from '../../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { createFactoryCNCDamageExcel } from '../../../../config/downloadExcel/Logs/Factory/CNC/CNCDamage/index.js';

export const listing_cnc_damage = catchAsync(async (req, res) => {
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

  const aggLookupCncDoneDetails = {
    $lookup: {
      from: 'cnc_done_details',
      localField: 'cnc_done_id',
      foreignField: '_id',
      as: 'cnc_done_details',
    },
  };
  const aggLookUpIssueForCncDetails = {
    $lookup: {
      from: 'issue_for_cnc_details_view',
      localField: 'cnc_done_details.issue_for_cnc_id',
      foreignField: '_id',
      as: 'issue_for_cnc_details',
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

  const aggUnwindCncDoneDetails = {
    $unwind: {
      path: '$cnc_done_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUnwindIssueForCncDetails = {
    $unwind: {
      path: '$issue_for_cnc_details',
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
    aggLookupCncDoneDetails,
    aggUnwindCncDoneDetails,
    aggLookUpIssueForCncDetails,
    aggUnwindIssueForCncDetails,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const cnc_damage_list = await cnc_damage_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] = await cnc_damage_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'CNC Damage Data Fetched Successfully',
    {
      data: cnc_damage_list,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});



export const add_cnc_damage = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  const { id, damage_sheets } = req.query;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log('damage_sheets : ', damage_sheets);
    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    if (!damage_sheets) {
      throw new ApiError('Damage Sheets are missing');
    }
    
    const cnc_done_details = await cnc_done_details_model
    .findById(id)
    .lean()
    .session();
    
    if (!cnc_done_details) {
      throw new ApiError('CNC done details not found.', StatusCodes.NOT_FOUND);
    }

    if (cnc_done_details?.available_details?.no_of_sheets === 0) {
      throw new ApiError('No available sheets found.', StatusCodes.NOT_FOUND);
    }

    const damage_sqm = Number(
      (
        (damage_sheets / cnc_done_details?.available_details?.no_of_sheets) *
        cnc_done_details?.available_details?.sqm
      )?.toFixed(3)
    );
    
    const [maxSrNo] = await cnc_damage_model.aggregate([
      {
        $group: {
          _id: null,
          max_sr_no: {
            $max: '$sr_no',
          },
        },
      },
    ]);
    console.log(maxSrNo.max_sr_no);
    const [create_damage_result] = await cnc_damage_model.create(
      [
        {
          cnc_done_id: cnc_done_details?._id,
          no_of_sheets: damage_sheets,
          sqm: damage_sqm,
          sr_no: maxSrNo ? maxSrNo?.max_sr_no + 1 : 1,
          created_by: userDetails?._id,
          updated_by: userDetails?._id,
        },
      ],
      { session }
    );
    
    if (!create_damage_result) {
      throw new ApiError(
        'Failed to add damage details',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_cnc_done_result = await cnc_done_details_model.updateOne(
      { _id: cnc_done_details?._id },
      {
        $inc: {
          'available_details.sqm': -damage_sqm,
          'available_details.no_of_sheets': -damage_sheets,
        },
        $set: {
          updated_by: userDetails?._id,
          isEditable: false,
        },
      },
      { session }
    );

    if (update_cnc_done_result.matchedCount === 0) {
      throw new ApiError(
        'CNC done details not found.',
        StatusCodes.BAD_REQUEST
      );
    }
    
    if (
      !update_cnc_done_result.acknowledged ||
      update_cnc_done_result.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update CNC done details.',
        StatusCodes.BAD_REQUEST
      );
    }
    
    const response = new ApiResponse(
      StatusCodes.OK,
      'CNC Item added to damage successfully.',
      create_damage_result
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

export const revert_damage_to_cnc_done = catchAsync(async (req, res) => {
  const userDetails = req.userDetails;
  
  const { id } = req.params;
  const session = await mongoose.startSession();
  try {
    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }
    
    session.startTransaction();
    
    const cnc_damage_details = await cnc_damage_model
    .findById(id)
    .lean()
    .session(session);
    if (!cnc_damage_details) {
      throw new ApiError('CNC Damage details not found', StatusCodes.NOT_FOUND);
    }
    
    const delete_damage_data_result = await cnc_damage_model.deleteOne(
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

    const update_cnc_done_item_result =
      await cnc_done_details_model.findOneAndUpdate(
        { _id: cnc_damage_details?.cnc_done_id },
        {
          $inc: {
            'available_details.no_of_sheets': cnc_damage_details.no_of_sheets,
            'available_details.sqm': cnc_damage_details.sqm,
          },
        },
        { session }
      );

    if (!update_cnc_done_item_result) {
      throw new ApiError(
        'Failed to update cnc done details',
        StatusCodes.BAD_REQUEST
      );
    }

    const is_item_editable = await cnc_done_details_model
    .findById(cnc_damage_details?.cnc_done_id)
      .lean()
      .session(session);

      if (
        is_item_editable?.no_of_sheets ===
      is_item_editable?.available_details?.no_of_sheets
    ) {
      const update_cnc_result = await cnc_done_details_model.updateOne(
        { _id: is_item_editable?._id },
        {
          $set: {
            isEditable: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );
      if (update_cnc_result.matchedCount === 0) {
        throw new ApiError('CNC done details not found.');
      }
      if (
        !update_cnc_result?.acknowledged ||
        update_cnc_result.modifiedCount === 0
      ) {
        throw new ApiError('Failed to update CNC editable status');
      }
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

  export const download_excel_factory_cnc_damage = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 1,
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
  
    const aggLookupCncDoneDetails = {
      $lookup: {
        from: 'cnc_done_details',
        localField: 'cnc_done_id',
        foreignField: '_id',
        as: 'cnc_done_details',
      },
    };
    const aggLookUpIssueForCncDetails = {
      $lookup: {
        from: 'issue_for_cnc_details_view',
        localField: 'cnc_done_details.issue_for_cnc_id',
        foreignField: '_id',
        as: 'issue_for_cnc_details',
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
  
    const aggUnwindCncDoneDetails = {
      $unwind: {
        path: '$cnc_done_details',
        preserveNullAndEmptyArrays: true,
      },
    };
    const aggUnwindIssueForCncDetails = {
      $unwind: {
        path: '$issue_for_cnc_details',
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
      aggLookupCncDoneDetails,
      aggUnwindCncDoneDetails,
      aggLookUpIssueForCncDetails,
      aggUnwindIssueForCncDetails,
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      aggMatch,
      // aggSort,
      // aggSkip,
      // aggLimit,
    ]; // aggregation pipiline
  
    const data = await cnc_damage_model.aggregate(listAggregate);
  
    await createFactoryCNCDamageExcel(data,req, res);
  
  });