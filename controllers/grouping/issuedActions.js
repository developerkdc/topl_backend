import mongoose from 'mongoose';
import { GroupModel } from '../../database/schema/group/groupCreated/groupCreated.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { IssuedForDyingGroupModel } from '../../database/schema/dying/issueForDyingGroup.js';

export const IssueForDyingGroup = catchAsync(async (req, res, next) => {
  const authUserDetail = req.userDetails;
  const data = req.body;
  const issuedForDyingIds = [...data.item_details];

  const a = await GroupModel.find(
    {
      _id: { $in: issuedForDyingIds },
      status: { $ne: 'issued for dying' },
    },
    {
      item_received_quantities: 1,
    }
  );

  await IssuedForDyingGroupModel.insertMany(
    a?.map((e) => {
      return {
        group_id: e._id,
        created_employee_id: authUserDetail._id,
      };
    })
  );

  await GroupModel.updateMany(
    {
      _id: { $in: issuedForDyingIds },
    },
    {
      $set: {
        status: 'issued for dying',
      },
    }
  );
  return res.json({
    status: true,
    message: 'Issue for dying successful',
  });
});

export const CancelDyingGroup = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if the ID exists in IssuedForSmokingIndividualModel
    const issueRecord = await IssuedForDyingGroupModel.findOne({
      group_id: id,
    }).session(session);

    if (issueRecord) {
      // If the record exists in IssuedForSmokingIndividualModel, remove it
      await IssuedForDyingGroupModel.deleteOne({ group_id: id }).session(
        session
      );

      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await GroupModel.updateOne(
        { _id: issueRecord.group_id },
        { $set: { status: 'available' } }
      ).session(session);
    } else {
      // If the record does not exist in IssuedForSmokingIndividualModel, return error
      throw new Error('Record not found in Issued For Dying.');
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: 'Cancellation successful.',
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: 'Error occurred while cancelling smoking.',
      error: error.message,
    });
  }
});

export const FetchIssuedForDyingGroup = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = 'updated_at', sort = 'desc' } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery['created_at'] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const totalDocuments = await IssuedForDyingGroupModel.aggregate([
    {
      $lookup: {
        from: 'groups',
        localField: 'group_id',
        foreignField: '_id',
        as: 'group_id',
      },
    },
    {
      $unwind: '$group_id',
    },
    {
      $lookup: {
        from: 'raw_materials', // Assuming "items" is the collection name for item details
        localField: 'group_id.item_details',
        foreignField: '_id',
        as: 'group_id.item_details',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: 'created_employee_id',
      },
    },
    {
      $unwind: {
        path: '$created_employee_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $count: 'totalDocuments',
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  // const rawVeneerData = await IssuedForDyingGroupModel.find({
  //   ...matchQuery,
  //   ...searchQuery,
  // })
  //   .populate({
  //     path: "created_employee_id",
  //     select: "_id employee_id first_name last_name",
  //   })
  //   .populate({
  //     path: "group_id",
  //     populate: {
  //       path: "item_details",
  //     },
  //   })
  //   .skip(skip)
  //   .limit(limit)
  //   .sort({ [sortBy]: sort })
  //   .exec();

  const rawVeneerData = await IssuedForDyingGroupModel.aggregate([
    {
      $lookup: {
        from: 'groups',
        localField: 'group_id',
        foreignField: '_id',
        as: 'group_id',
      },
    },
    {
      $unwind: '$group_id',
    },
    {
      $lookup: {
        from: 'raw_materials', // Assuming "items" is the collection name for item details
        localField: 'group_id.item_details',
        foreignField: '_id',
        as: 'group_id.item_details',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: 'created_employee_id',
      },
    },
    {
      $unwind: {
        path: '$created_employee_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return res.status(200).json({
    result: rawVeneerData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});
