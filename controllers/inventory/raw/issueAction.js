import catchAsync from "../../../utils/errors/catchAsync.js";
import { RawMaterialModel } from "../../../database/schema/inventory/raw/raw.schema.js";

import mongoose from "mongoose";
import { IssuedForDyingIndividualModel } from "../../../database/schema/dying/issuedForDyingIndividual.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";

export const IssueForDyingRaw = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction

  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const data = req.body;
    const issuedForDyingIds = [...data.item_details];

    // Find raw materials that are not already issued for Dying
    const rawMaterials = await RawMaterialModel.find(
      {
        _id: { $in: issuedForDyingIds },
        status: { $ne: "issued for dying" },
      },
      {
        item_available_pattas: 1,
      }
    ).session(session);

    // Create documents for issued items
    const issuedItems = rawMaterials.map((e) => ({
      item_id: e._id,
      issued_dying_quantity: e.item_available_pattas,
      created_employee_id: authUserDetail._id,
    }));

    // Insert issued items into the IssuedForDyingIndividualModel
    await IssuedForDyingIndividualModel.insertMany(issuedItems, { session });

    // Update status of raw materials to "issued for Dying"
    await RawMaterialModel.updateMany(
      {
        _id: { $in: issuedForDyingIds },
      },
      {
        $set: {
          status: "issued for dying",
        },
      }
    ).session(session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Issue for dying successful",
    });
  } catch (error) {
    // Rollback the transaction if there is any error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: error.message });
  }
});

export const CancelDyingRaw = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if the ID exists in IssuedForDyingIndividualModel
    const issueRecord = await IssuedForDyingIndividualModel.findOne({
      item_id: id,
    }).session(session);

    if (issueRecord) {
      // If the record exists in IssuedForDyingIndividualModel, remove it
      await IssuedForDyingIndividualModel.deleteOne({ item_id: id }).session(
        session
      );

      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await RawMaterialModel.updateOne(
        { _id: issueRecord.item_id },
        { $set: { status: "available" } }
      ).session(session);
    } else {
      // If the record does not exist in IssuedForDyingIndividualModel, return error
      throw new Error("Record not found in Issued For Dying.");
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Cancellation successful.",
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: "Error occurred while cancelling smoking.",
      error: error.message,
    });
  }
});

export const IssueForDyingRawPattas = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction

  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const item_id = req.body.item_id;
    const data = { ...req.body, created_employee_id: authUserDetail._id };

    const isIssued = await RawMaterialModel.findById(req.body.item_id);
    console.log(isIssued);
    if (isIssued.status == "issued for dying") {
      // Rollback the transaction if the material is already issued for dying
      await session.abortTransaction();
      session.endSession();
      return res.json({
        status: false,
        message: "Issue for dying failed",
      });
    }

    const newData = new IssuedForDyingIndividualModel(data);
    const savedIssuedForSmoking = await newData.save({ session });

    await RawMaterialModel.findByIdAndUpdate(
      {
        _id: item_id,
      },
      {
        $set: {
          status: "issued for dying",
        },
      },
      { session }
    );

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Issue for smoking successful",
      result: savedIssuedForSmoking,
    });
  } catch (error) {
    // Rollback the transaction if there is any error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: error.message });
  }
});

export const IssuedForDyingRawList = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers ,arrayField=[]} = req?.body?.searchFields || {};
 const { page, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || "";

  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
    const searchdata = DynamicSearch(search, boolean, numbers, string,arrayField);
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
    matchQuery["created_at"] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await IssuedForDyingIndividualModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const rawVeneerData = await IssuedForDyingIndividualModel.aggregate([
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_id",
        foreignField: "_id",
        as: "item_id",
      },
    },
    {
      $unwind: {
        path: "$item_id",
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
