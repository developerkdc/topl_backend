import mongoose, { isValidObjectId } from 'mongoose';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import issue_for_polishing_model from '../../../../database/schema/factory/polishing/issue_for_polishing/issue_for_polishing.schema.js';
import { issues_for_status } from '../../../../database/Utils/constants/constants.js';

export const add_issue_for_polishing_from_pressing = catchAsync(
  async (req, res) => {
    const userDetails = req.userDetails;
    const { issued_sheets, pressing_item_id } = req.body;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      for (let field of ['issued_sheets', 'pressing_item_id']) {
        if (!req.body[field]) {
          throw new ApiError(`${field} is missing...`, StatusCodes.BAD_REQUEST);
        }
      }

      const pressing_item_details = await pressing_item_details_model
        ?.findOne({
          _id: pressing_item_id,
          available_sheets: { $gt: 0 },
          issue_status: null,
        })
        .lean();

      if (!pressing_item_details) {
        throw new ApiError(
          'Pressing Details not found.',
          StatusCodes.NOT_FOUND
        );
      }

      if (pressing_item_details?.available_sheets === 0) {
        throw new ApiError('No Available sheets found.', StatusCodes.NOT_FOUND);
      }

      const factor = Number(
        issued_sheets / pressing_item_details?.no_of_sheets
      );
      const issued_sqm = Number(
        (factor * pressing_item_details?.available_sqm)?.toFixed(3)
      );
      const issued_amount = Number(
        (factor * pressing_item_details?.available_amount)?.toFixed(3)
      );

      const max_sr_no_doc = await issue_for_polishing_model
        .findOne({}, { sr_no: 1 })
        .sort({ sr_no: -1 })
        .limit(1)
        .lean();

      const max_sr_no = max_sr_no_doc ? max_sr_no_doc?.sr_no + 1 : 1;

      const [add_issue_for_polishing_result] =
        await issue_for_polishing_model.create(
          [
            {
              sr_no: max_sr_no,
              pressing_details_id: pressing_item_details?._id,
              issued_amount: issued_amount,
              issued_sheets: issued_sheets,
              issued_sqm: issued_sqm,
              created_by: userDetails?._id,
              updated_by: userDetails?._id,
            },
          ],
          { session }
        );

      if (!add_issue_for_polishing_result) {
        throw new ApiError(
          'Failed to add issue for polishing data.',
          StatusCodes.BAD_REQUEST
        );
      }

      const update_pressing_details_result =
        await pressing_item_details_model?.updateOne(
          { _id: pressing_item_details?._id },
          {
            $inc: {
              available_sheets: -issued_sheets,
              available_amount: -issued_amount,
              available_sqm: -issued_sqm,
            },
            $set: {
              isEditable: false,
              updated_by: userDetails?._id,
            },
          },
          { session }
        );

      if (update_pressing_details_result?.matchedCount === 0) {
        throw new ApiError(
          'Pressing Item details not found.',
          StatusCodes.NOT_FOUND
        );
      }
      if (
        !update_pressing_details_result?.acknowledged ||
        update_pressing_details_result?.modifiedCount === 0
      ) {
        throw new ApiError(
          'Failed to update pressing available details',
          StatusCodes.BAD_REQUEST
        );
      }

      //create pressing history
      const [create_pressing_history] = await pressing_item_details?.create(
        [
          {
            issue_status: issues_for_status?.polishing_factory,
            pressing_item_id: pressing_item_details?._id,
            created_by: userDetails?._id,
            updated_by: userDetails?._id,
          },
        ],
        { session }
      );

      if (!create_pressing_history) {
        throw new ApiError(
          'Failed to create pressing history',
          StatusCodes.BAD_REQUEST
        );
      }

      const response = new ApiResponse(
        StatusCodes.OK,
        'Item Issued For polishing Successfully',
        add_issue_for_polishing_result
      );

      await session?.commitTransaction();
      return res.status(StatusCodes.OK).json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
);

export const revert_issue_for_polishing = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError('ID is missing', StatusCodes.BAD_REQUEST);
  }
  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  const userDetails = req.userDetails;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const issue_for_polishing_details = await issue_for_polishing_model
      .findById(id)
      .lean();

    if (!issue_for_polishing_details) {
      throw new ApiError(
        'Issue for polishing details not found.',
        StatusCodes.NOT_FOUND
      );
    }

    //? update pressing item details
    const update_pressing_details_result =
      await pressing_item_details_model?.updateOne(
        { _id: issue_for_polishing_details?.pressing_details_id },
        {
          $inc: {
            available_sheets: issue_for_polishing_details?.issued_sheets,
            available_amount: issue_for_polishing_details?.issued_amount,
            available_sqm: issue_for_polishing_details?.issued_sqm,
          },
          $set: {
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_pressing_details_result?.matchedCount === 0) {
      throw new ApiError('Pressing Details not found.', StatusCodes.NOT_FOUND);
    }
    if (
      !update_pressing_details_result?.acknowledged ||
      update_pressing_details_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update pressing details.',
        StatusCodes.NOT_FOUND
      );
    }

    //todo update isEditable status

    // deleting issue for polishing documnet
    const delete_issue_for_polishing_document_result =
      await issue_for_polishing_model.deleteOne(
        { _id: issue_for_polishing_details?._id },
        { session }
      );

    if (
      !delete_issue_for_polishing_document_result?.acknowledged ||
      delete_issue_for_polishing_document_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete issue for polishing details.',
        StatusCodes.BAD_REQUEST
      );
    }

    //todo delete pressing document
    const delete_pressing_history_result =
      await plywood_history_model.deleteOne({
        pressing_details_id: issue_for_polishing_details?.pressing_details_id,
      });

    if (
      !delete_pressing_history_result.acknowledged ||
      delete_pressing_history_result?.deletedCount === 0
    ) {
      throw new ApiError(
        'Failed to delete pressing history',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'Item Reverted Successfully',
      delete_issue_for_polishing_document_result
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

export const listing_issued_for_polishing = catchAsync(
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
      is_polishing_done: false,
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

    const issue_for_polishing =
      await issue_for_polishing_model.aggregate(listAggregate);

    const aggCount = {
      $count: 'totalCount',
    }; // count aggregation stage

    const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

    const totalDocument =
      await issue_for_polishing_model.aggregate(totalAggregate);

    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

    const response = new ApiResponse(
      StatusCodes.OK,
      'Issue For polishing Data Fetched Successfully',
      {
        data: issue_for_polishing,
        totalPages: totalPages,
      }
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const fetch_single_issue_for_polishing_item = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }
    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const result = await issue_for_polishing_model.findOne({ _id: id }).lean();

    if (!result) {
      throw new ApiError(
        'Issue for polishing data not found',
        StatusCodes.NOT_FOUND
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'polishing Details fetched successfully',
      result
    );
    return res.status(StatusCodes.OK).json(response);
  }
);
