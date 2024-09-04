import mongoose from "mongoose";
import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import { GroupHistoryModel } from "../../database/schema/group/groupHistory/groupHistory.schema.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";
import { IssuedForSmokingGroupModel } from "../../database/schema/smoking/issueForSmokingGroup.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { IssuedForGroupingModel } from "../../database/schema/group/issueForGrouping/issueForGrouping.schema.js";
import { IssuedForCuttingModel } from "../../database/schema/cutting/issuedForCutting.js";
import ApiError from "../../utils/errors/apiError.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import fs from "fs";
import GroupImagesModel from "../../database/schema/images/groupImages.schema.js";
import { deleteImagesFromStorage } from "../../config/multer/multer.js";
import { GroupSmokeModel } from "../../database/schema/smoking/groupSmoked.js";
import { IssuedForDyingGroupModel } from "../../database/schema/dying/issueForDyingGroup.js";
import { GroupDyingModel } from "../../database/schema/dying/groupDying.js";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 5 });
export const CreateGroup = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction

  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const bodyData = req.body;
    console.log(bodyData, "bodyData");
    const imageFilenames = req?.files?.group_images?.map(
      (file) => file?.filename
    );
    const item_details = JSON?.parse(bodyData?.item_details);
    const data = {
      ...bodyData,
      item_details: item_details,
      group_images: imageFilenames,
    };

    // if (imageFilenames?.length > 0) {
    //   const group_no = bodyData.group_no;
    //   const existingDocument = await GroupImagesModel.findOne({
    //     group_no,
    //   }).session(session);

    //   if (existingDocument) {
    //     await GroupImagesModel.findOneAndUpdate(
    //       { group_no },
    //       { $push: { group_images: { $each: imageFilenames } } },
    //       { upsert: true, new: true, session }
    //     );
    //   } else {
    //     await GroupImagesModel.create(
    //       [
    //         {
    //           group_images: imageFilenames,
    //           group_no: group_no,
    //         },
    //       ],
    //       { session }
    //     );
    //   }
    // }

    if (imageFilenames && imageFilenames.length > 0) {
      const group_no = bodyData.group_no;
      const existingDocument = await GroupImagesModel.findOne({
        group_no,
      }).session(session);

      if (existingDocument) {
        await GroupImagesModel.findOneAndUpdate(
          { group_no },
          { $push: { group_images: { $each: imageFilenames } } },
          { upsert: true, new: true, session }
        );
      } else {
        await GroupImagesModel.create(
          [
            {
              group_images: imageFilenames,
              group_no: group_no,
            },
          ],
          { session }
        );
      }
    } else {
      const group_no = bodyData.group_no;
      await GroupImagesModel.create(
        [
          {
            group_images: [],
            group_no: group_no,
          },
        ],
        { session }
      );
    }

    const issuedForGroupingItems = await RawMaterialModel.find({
      _id: { $in: item_details },
      status: "issued for grouping",
    }).session(session);

    console.log(issuedForGroupingItems);
    if (issuedForGroupingItems.length != item_details.length) {
      return res.status(400).json({
        status: false,
        message:
          "Cannot create group because some items are not issued for grouping or already grouped.",
      });
    }

    const groupedItems = await RawMaterialModel.find({
      _id: { $in: item_details },
      status: "grouped",
    }).session(session);

    if (groupedItems.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "Cannot create group because some items are already grouped.",
      });
    }

    const group_data = {
      ...data,
      created_employee_id: authUserDetail._id,
    };

    const newGroup = new GroupModel(group_data);
    const savedGroupData = await newGroup.save({ session });

    const createdData = await GroupModel.findById(savedGroupData._id)
      .populate({
        path: "item_details",
      })
      .lean()
      .session(session);

    const createdGroup = await RawMaterialModel.updateMany(
      { _id: { $in: item_details } },
      { status: "grouped" }
    ).session(session);

    if (createdGroup) {
      await IssuedForGroupingModel.deleteMany({
        item_id: { $in: item_details },
      });
    }
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      result: savedGroupData,
      status: true,
      message: "Group created successfully",
    });
  } catch (error) {
    // Rollback the transaction if there is any error
    await session.abortTransaction();
    session.endSession();
    if (req.files) {
      const fileFields = Object.keys(req.files);
      fileFields.forEach((field) => {
        const uploadedFiles = req.files[field];
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach((file) => {
            fs.unlinkSync(file.path);
          });
        }
      });
    }
    return res.status(500).json({
      status: false,
      message: "Error occurred while creating group.",
      error: error.message,
    });
  }
});

export const FetchCreatedGroups = catchAsync(async (req, res, next) => {
  const cacheKey = req.originalUrl;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;
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
    matchQuery["date_of_grouping"] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await GroupModel.aggregate([
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_details",
        foreignField: "_id",
        as: "item_details",
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

  const rawVeneerData = await GroupModel.aggregate([
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_details",
        foreignField: "_id",
        as: "item_details",
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
  const responseData = {
    result: rawVeneerData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  };

  // Cache the response data with a TTL of 1 minute
  cache.set(cacheKey, responseData, 5); // Cache TTL set to 60 seconds

  return res.status(200).json(responseData);
});

export const GetLatestGroupNo = catchAsync(async (req, res, next) => {
  try {
    // Find all documents, sort them by group_no in descending order, and limit to 1 document
    const latestGroup = await GroupModel.find().sort({ group_no: -1 }).limit(1);

    if (latestGroup.length > 0) {
      const latestGroupNo = latestGroup[0].group_no + 1;
      res.status(200).json({ latestGroupNo });
    } else {
      res.status(200).json({ latestGroupNo: 1 });
      // If no documents found, return a default value or handle the scenario accordingly
      res.status(404).json({ message: "No groups found" });
    }
  } catch (error) {
    // Handle any errors that may occur during the database operation
    res.status(500).json({ error: error.message });
  }
});

export const IssueForSmokingGroup = catchAsync(async (req, res, next) => {
  const authUserDetail = req.userDetails;
  const data = req.body;
  const issuedForSmokingIds = [...data.item_details];

  const a = await GroupModel.find(
    {
      _id: { $in: issuedForSmokingIds },
      status: { $ne: "issued for smoking" },
    },
    {
      item_received_quantities: 1,
    }
  );
  if (a.length != issuedForSmokingIds.length) {
    throw new Error("Already Issued");
  }
  await IssuedForSmokingGroupModel.insertMany(
    a?.map((e) => {
      return {
        group_id: e._id,
        created_employee_id: authUserDetail._id,
      };
    })
  );

  await GroupModel.updateMany(
    {
      _id: { $in: issuedForSmokingIds },
    },
    {
      $set: {
        status: "issued for smoking",
      },
    }
  );
  return res.json({
    status: true,
    message: "Issue for smoking successful",
  });
});

export const CancelSmokingGroup = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if the ID exists in IssuedForSmokingIndividualModel
    const issueRecord = await IssuedForSmokingGroupModel.findOne({
      group_id: id,
    }).session(session);

    if (issueRecord) {
      // If the record exists in IssuedForSmokingIndividualModel, remove it
      await IssuedForSmokingGroupModel.deleteOne({ group_id: id }).session(
        session
      );

      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await GroupModel.updateOne(
        { _id: issueRecord.group_id },
        { $set: { status: "available" } }
      ).session(session);
    } else {
      // If the record does not exist in IssuedForSmokingIndividualModel, return error
      throw new Error("Record not found in Issued For Smoking.");
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

export const FetchIssuedForSmokingGroup = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;
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
    matchQuery["created_at"] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await IssuedForSmokingGroupModel.aggregate([
    {
      $lookup: {
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        as: "group_id",
      },
    },
    {
      $unwind: "$group_id",
    },
    {
      $lookup: {
        from: "raw_materials", // Assuming "items" is the collection name for item details
        localField: "group_id.item_details",
        foreignField: "_id",
        as: "group_id.item_details",
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

  const rawVeneerData = await IssuedForSmokingGroupModel.aggregate([
    {
      $lookup: {
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        as: "group_id",
      },
    },
    {
      $unwind: "$group_id",
    },
    {
      $lookup: {
        from: "raw_materials", // Assuming "items" is the collection name for item details
        localField: "group_id.item_details",
        foreignField: "_id",
        as: "group_id.item_details",
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

export const IssueForCuttingGroup = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const created_employee_id = req.userDetails._id;

    // Validate required fields
    const {
      group_id,
      cutting_item_details,
      total_item_sqm_original,
      group_no_of_pattas_original,
      group_no_of_pattas_available,
      total_item_sqm_available,
      cutting_issued_sqm,
    } = req.body;
    if (
      !group_id ||
      !cutting_item_details ||
      !total_item_sqm_original ||
      !group_no_of_pattas_original
      // !group_no_of_pattas_available ||
      // !group_sqm_available
    ) {
      return res.json({
        status: false,
        message: "Missing required fields",
      });
    }

    // Fetch the group details
    const groupDetails = await GroupModel.findById(group_id).populate(
      "item_details"
    );
    if (!groupDetails) {
      return res.json({
        status: false,
        message: "Group not found",
      });
    }

    // Validate cutting quantities against available quantities
    for (const item of cutting_item_details) {
      const rawMaterial = await RawMaterialModel.findById(item.item_id);
      if (!rawMaterial) {
        return res.json({
          status: false,
          message: "Invalid item ID",
        });
      }

      // Validate cutting quantities against available quantities
      if (item.cutting_quantity > rawMaterial.item_available_pattas) {
        return res.json({
          status: false,
          message: "Cutting quantities exceed available quantities",
        });
      }
      // if (
      //   item.cutting_quantity.natural >
      //     rawMaterial.item_available_quantities.natural ||
      //   item.cutting_quantity.dyed >
      //     rawMaterial.item_available_quantities.dyed ||
      //   item.cutting_quantity.smoked >
      //     rawMaterial.item_available_quantities.smoked ||
      //   item.cutting_quantity.total >
      //     rawMaterial.item_available_quantities.total
      // ) {
      //   return res.json({
      //     status: false,
      //     message: "Cutting quantities exceed available quantities",
      //   });
      // }

      // Update available quantities by reducing the cutting quantities
      // rawMaterial.item_available_quantities.natural -=
      //   item.cutting_quantity.natural;
      // rawMaterial.item_available_quantities.dyed -= item.cutting_quantity.dyed;
      // rawMaterial.item_available_quantities.smoked -=
      //   item.cutting_quantity.smoked;
      // rawMaterial.item_available_quantities.total -=
      //   item.cutting_quantity.total;

      // Save the updated raw material document
      rawMaterial.item_available_pattas -= item.cutting_quantity;

      const calculation =
        (item.cutting_quantity *
          rawMaterial.item_length *
          rawMaterial.item_width) /
        10000;
      rawMaterial.item_available_sqm -= calculation;

      // Convert item_available_sqm back to a floating-point number with 2 decimal places
      rawMaterial.item_available_sqm = parseFloat(
        rawMaterial.item_available_sqm.toFixed(2)
      );
      // throw new Error("Trial");
      await rawMaterial.save({ validateBeforeSave: false });
    }
    let status = "available";
    if (group_no_of_pattas_available == 0) {
      status = "not available";
    }
    // Update group data
    const updatedGroupData = await GroupModel.findOneAndUpdate(
      { _id: group_id },
      {
        $set: {
          total_item_sqm_original,
          group_no_of_pattas_original,
          group_no_of_pattas_available,
          total_item_sqm_available,
          status,
        },
      },
      { new: true }
    );

    // Save group history data
    const groupHistory = new GroupHistoryModel({
      group_id: await GroupModel.findById(group_id),
      cutting_item_details,
      created_employee_id,
    });

    const savedGroupHistoryData = await groupHistory.save();

    // Create IssuedForCuttingModel instance
    const issuedForCutting = new IssuedForCuttingModel({
      group_id,
      group_history_id: savedGroupHistoryData._id,
      cutting_item_details,
      cutting_issued_sqm,
      created_employee_id,
    });

    // Save the data to the database
    await issuedForCutting.save();

    await session.commitTransaction();
    session.endSession();

    // Send success response
    res.status(201).json({ message: "Issued for cutting added successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ message: error.message });
  }
});

export const UpdateGroupVeneer = catchAsync(async (req, res, next) => {
  const { id } = req.query;
  const { group_pallete_no, group_physical_location } = req.body;

  // Construct update object based on provided values
  const updateObj = {};
  if (group_pallete_no !== undefined && group_pallete_no !== "") {
    updateObj.group_pallete_no = group_pallete_no;
  }
  if (group_physical_location !== undefined && group_physical_location !== "") {
    updateObj.group_physical_location = group_physical_location;
  }

  // Check if there are any fields to update
  if (Object.keys(updateObj).length === 0) {
    return res.status(400).json({
      statusCode: 400,
      status: false,
      message: "No fields provided for update.",
    });
  }

  // Add updated_at field to the update object
  updateObj.updated_at = Date.now();

  // Find and update the document
  const updatedVeneer = await GroupModel.findOneAndUpdate(
    { _id: id },
    { $set: updateObj },
    { new: true }
  );

  if (!updatedVeneer) {
    return next(new ApiError("Veneer Not Found", 404));
  }

  return res.status(200).json({
    statusCode: 200,
    status: true,
    data: updatedVeneer,
    message: "Veneer Updated",
  });
});

export const RevertCreatedGroup = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { groupId } = req.query;
    const groupDetails = await GroupModel.findById(groupId).session(session);

    if (
      groupDetails.group_no_of_pattas_available !=
        groupDetails.group_no_of_pattas_original ||
      (await IssuedForSmokingGroupModel.findOne({ group_id: groupId })) ||
      (await GroupSmokeModel.findOne({ group_id: groupId })) ||
      (await IssuedForDyingGroupModel.findOne({ group_id: groupId })) ||
      (await GroupDyingModel.findOne({ group_id: groupId }))
    ) {
      throw new Error("Group cannot be reverted");
    }

    const rawMaterialIds = groupDetails.item_details.map((item) => item);
    console.log(rawMaterialIds);
    await RawMaterialModel.updateMany(
      { _id: { $in: rawMaterialIds } },
      { $set: { status: "issued for grouping" } },
      { session }
    );

    const created_employee_id = req.userDetails._id;
    const rawMaterialsToInsert = rawMaterialIds.map((item) => ({
      item_id: item,
      created_employee_id: created_employee_id,
    }));
    await IssuedForGroupingModel.insertMany(rawMaterialsToInsert, { session });
    await GroupModel.findByIdAndDelete(groupId).session(session);
    const ImageData = await GroupImagesModel.findOne({
      group_no: groupDetails.group_no,
    });
    if (ImageData) {
      let deleteData = await deleteImagesFromStorage(
        `./public/upload/images/group`,
        ImageData.group_images
      );
    }
    await GroupImagesModel.findOneAndDelete({
      group_no: groupDetails.group_no,
    });
    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Success",
      result: "Group reverted successfully",
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return res.status(500).json({
      status: false,
      message: "Error occurred while reverting group",
      error: error.message,
    });
  }
});
