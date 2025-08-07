import mongoose, { isValidObjectId } from 'mongoose';
import { plywood_production_model } from '../../../../database/schema/factory/plywood_production/plywood_production.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { plywood_production_damage_model } from '../../../../database/schema/factory/plywood_production/plywood_production_damage_sheets.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';

export const listing_plywood_production_damage = catchAsync(
  async (req, res, next) => {
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
      aggCreatedByLookup,
      aggCreatedByUnwind,
      aggUpdatedByLookup,
      aggUpdatedByUnwind,
      aggMatch,
      aggSort,
      aggSkip,
      aggLimit,
    ]; // aggregation pipiline

    const plywood_production_damage_list =
      await plywood_production_damage_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

    const totalDocument =
      await plywood_production_damage_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      200,
      'Plywood production damage Data Fetched Successfully',
      {
        data: plywood_production_damage_list,
        totalPages: totalPages,
      }
    );
    return res.status(200).json(response);
  }
);

export const revert_plywood_production_damage = catchAsync(
  async function (req, res, next) {
    const { id } = req.params;
    const userDetails = req.userDetails;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!id) {
        throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
      }
      if (!isValidObjectId(id)) {
        throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
      }

      const plywood_production_damage_data =
        await plywood_production_damage_model.findById(id).lean();

      if (!plywood_production_damage_data) {
        throw new ApiError(
          'Data is not available in damage data',
          StatusCodes.BAD_REQUEST
        );
      }

      const update_plywood_production_done_on_revert =
        await plywood_production_model.updateOne(
          { _id: plywood_production_damage_data?.plywood_production_id },
          {
            $inc: {
              available_no_of_sheets: Number(
                plywood_production_damage_data?.damage_sheets
              ),
              available_total_sqm: Number(
                plywood_production_damage_data?.damage_sqm
              ),
            },
            $set: {
              is_added_to_damage: false,
            },
          },
          { session }
        );

      if (
        !update_plywood_production_done_on_revert ||
        update_plywood_production_done_on_revert?.modifiedCount <= 0
      ) {
        throw new ApiError(
          'Failed to Update plywood production data on damage revert',
          StatusCodes.BAD_REQUEST
        );
      }

      const revert_plywood_production_damage_data =
        await plywood_production_damage_model.findByIdAndDelete(id, {
          session,
        });

      if (
        !revert_plywood_production_damage_data ||
        revert_plywood_production_damage_data?.deletedCount <= 0
      ) {
        throw new ApiError('Failed to delete Plywood production damage data');
      }
      const result = [];

      await session.commitTransaction();

      const response = new ApiResponse(
        StatusCodes.OK,
        `plywood production damage data revert successfully`,
        result
      );

      return res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);
