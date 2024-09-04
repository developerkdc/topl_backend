import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";
import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import { GroupDyingModel } from "../../database/schema/dying/groupDying.js";
import { IssuedForDyingGroupModel } from "../../database/schema/dying/issueForDyingGroup.js";

export const FetchCreatedGroupDyed = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || "";

  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
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
        message: "Results Not Found",
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery["date_of_dying"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const totalDocuments = await GroupDyingModel.aggregate([
    {
      $lookup: {
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        as: "group_id",
      },
    },
    {
      $unwind: {
        path: "$group_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_details",
        foreignField: "_id",
        as: "item_details",
      },
    },
    {
      $unwind: {
        path: "$group_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
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
        [sortBy]: sort == "desc" ? -1 : 1,
      },
    },
    {
      $count: "totalDocuments",
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  const rawVeneerData = await GroupDyingModel.aggregate([
    {
      $lookup: {
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        as: "group_id",
      },
    },
    {
      $unwind: {
        path: "$group_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_details",
        foreignField: "_id",
        as: "item_details",
      },
    },
    {
      $unwind: {
        path: "$group_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
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
        [sortBy]: sort == "desc" ? -1 : 1,
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
    status: "success",
    totalPages: totalPages,
  });
});

export const RejectGroupDyed = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    // const authUserDetail = req.userDetails;
    session.startTransaction();
    // Check if the ID exists in IssuedForSmokingGroupModel
    const issueRecord = await GroupDyingModel.findOne({
      _id: id,
    }).session(session);

    if (issueRecord) {
      console.log(issueRecord, "issueRecord");
      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await GroupDyingModel.updateOne(
        { _id: id },
        { $set: { status: "rejected" } }
      ).session(session);

      await IssuedForDyingGroupModel.updateOne(
        { group_id: issueRecord.group_id },
        { $set: { status: "issued for dying" } }
      ).session(session);

      // const issuedItems = [
      //   {
      //     group_id: issueRecord.group_id,
      //     created_employee_id: authUserDetail._id,
      //   },
      // ];
      // console.log(issuedItems, "issuedItems");

      // // Insert issued items into the IssuedForSmokingGroupModel
      // await IssuedForSmokingGroupModel.insertMany(issuedItems, {
      //   session,
      // });
    } else {
      // If the record does not exist in IssuedForSmokingGroupModel, return error
      throw new Error("Record not found in Issued For Dying.");
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Rejectd successful.",
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: "Error occurred while cancelling dying.",
      error: error.message,
    });
  }
});

export const PassGroupDyed = catchAsync(async (req, res, next) => {
  const { id } = req.body;
  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Check if the ID exists in IssuedForSmokingGroupModel
    const issueRecord = await GroupDyingModel.findOne({
      _id: id,
    }).session(session);
    console.log(issueRecord, "issueRecord");

    if (issueRecord) {
      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await GroupDyingModel.updateOne(
        { _id: id },
        { $set: { status: "passed" } }
      ).session(session);
      // const RawData = await RawMaterialModel.find({
      //   _id: {
      //     $in: issueRecord.item_details.map(
      //       (id) => new mongoose.Types.ObjectId(id)
      //     ),
      //   },
      // }).session(session);

      // const updateQuantities = RawData.map((rawData) => {
      //   const updateQuantity = {
      //     natural: 0,
      //     dyed: 0,
      //     smoked:
      //       rawData.item_available_quantities.smoked +
      //       rawData.item_available_quantities.dyed +
      //       rawData.item_available_quantities.natural,
      //   };
      //   updateQuantity.total = updateQuantity.natural + updateQuantity.dyed + updateQuantity.smoked;
      //   return updateQuantity;
      // });
      // console.log(updateQuantities, "updateQuantities");

      await GroupModel.updateOne(
        { _id: issueRecord.group_id },
        { $set: { status: "available" } }
      ).session(session);

      // await RawMaterialModel.updateOne(
      //   { _id: issueRecord.item_details },
      //   { $set: { item_available_quantities: updateQuantities } }
      // ).session(session);
      await RawMaterialModel.updateMany(
        {
          _id: {
            $in: issueRecord.item_details.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
        },
        {
          $set: {
            item_code: "DYED",
          },
        },
        { session }
      );

      // for (const rawData of RawData) {
      //   // const updateQuantity = {
      //   //   natural: 0,
      //   //   smoked: 0,
      //   //   dyed:
      //   //     rawData.item_available_quantities.smoked +
      //   //     rawData.item_available_quantities.dyed +
      //   //     rawData.item_available_quantities.natural,
      //   // };
      //   // updateQuantity.total =
      //   //   updateQuantity.natural + updateQuantity.dyed + updateQuantity.smoked;
      //   // console.log(updateQuantity, "updateQuantity");
      //   await RawMaterialModel.updateOne(
      //     { _id: rawData._id },
      //     {
      //       $set: {
      //         item_code: "DYED",
      //       },
      //     },
      //     { session }
      //   );
      // }

      // // if create Smoking Group items doen delete item from issued Individual smoke model

      await IssuedForDyingGroupModel.deleteOne({
        group_id: new mongoose.Types.ObjectId(issueRecord.group_id),
      }).session(session);
    } else {
      // If the record does not exist in IssuedForSmokingGroupModel, return error
      throw new Error("Record not found in Issued For Smoking.");
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Passed successful.",
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: "Error occurred while cancelling Dying.",
      error: error.message,
    });
  }
});
