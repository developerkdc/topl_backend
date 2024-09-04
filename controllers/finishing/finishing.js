import { FinishingModel } from "../../database/schema/finishing/finishing.schema.js";
import { IssuedForFinishingModel } from "../../database/schema/finishing/issuedForFinishing.schema.js";
import GroupImagesModel from "../../database/schema/images/groupImages.schema.js";
import { QcDoneInventoryModel } from "../../database/schema/qcDone.js/qcDone.schema.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import mongoose from "mongoose";
import fs from "fs";
import { IssuedForPressingModel } from "../../database/schema/pressing/issuedForPressing.schema.js";
import { PressingModel } from "../../database/schema/pressing/pressing.schema.js";
import OtherGoodsModel from "../../database/schema/inventory/otherGoods/otherGoods.schema.js";
import OtherGoodsConsumedModel from "../../database/schema/inventory/otherGoods/otherGoodsConsumed.schema.js";

export const FetchIssuedForFinishing = catchAsync(async (req, res, next) => {
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
    matchQuery["updated_at"] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const totalDocuments = await IssuedForFinishingModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingView = mongoose.connection.db.collection(
    "issued_for_finishings_view"
  );

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
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
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForFinishingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const UpdateFinishingStatus = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Ensure required fields are present in the request body
    if (!req.body.issued_for_finishing_id || !req.body.status) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields in the request body.",
      });
    }

    // Validate status against the enum defined in your schema
    const validStatusValues = [
      "pending",
      "open grain",
      "sent for open grain",
      "metallic",
      "sent for metallic",
      "sent for rejected",
      "rejected",
    ]; // Replace with your enum values
    if (!validStatusValues.includes(req.body.status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status value.",
      });
    }

    const authUserDetail = req.userDetails;
    const updateFinishing = await IssuedForFinishingModel.findByIdAndUpdate(
      req.body.issued_for_finishing_id, // ID to find the document
      {
        $set: {
          status: req.body.status,
          status_updated_by: authUserDetail._id,
        },
      }, // Update object
      { new: true } // Options: return the updated document
    );

    if (!updateFinishing) {
      return res.status(404).json({
        status: false,
        message: "Document not found with the provided ID.",
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      result: updateFinishing,
      statusCode: 200,
      status: "success",
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error occurred while processing the request.",
      error: error.message,
    });
  }
});

// export const createFinishing = catchAsync(async (req, res, next) => {
//   let session;
//   try {
//     session = await mongoose.startSession();
//     session.startTransaction();

//     const authUserDetail = req.userDetails;
//     const imageFilenames = req?.files?.finishing_images?.map(
//       (file) => file?.filename
//     );
//     const data = {
//       ...req.body,
//       created_employee_id: authUserDetail._id,
//     };

//     const isIssued = await IssuedForFinishingModel.findById(
//       data.issued_for_finishing_id
//     );
//     if (!isIssued) {
//       throw new Error("Issued For Finishing not found");
//     }

//     if (imageFilenames?.length > 0) {
//       const groupNo = req.body.group_no;
//       const existingDocument = await GroupImagesModel.findOne({
//         group_no: groupNo,
//       }).session(session);
//       if (existingDocument) {
//         await GroupImagesModel.findOneAndUpdate(
//           { group_no: groupNo },
//           { $push: { finishing_images: { $each: imageFilenames } } },
//           { upsert: true, new: true, session }
//         );
//       } else {
//         await GroupImagesModel.create(
//           [
//             {
//               finishing_images: imageFilenames,
//               group_no: groupNo,
//             },
//           ],
//           { session }
//         );
//       }
//     }

//     const finishing = new FinishingModel(data);
//     const finishingSaved = await finishing.save({ session });

//     const qcDone = new QcDoneInventoryModel({
//       group_no: finishingSaved.group_no,
//       qc_no_of_pcs_available: finishingSaved.finishing_no_of_pcs,
//       qc_length: finishingSaved.finishing_length,
//       qc_width: finishingSaved.finishing_width,
//       qc_sqm: finishingSaved.finishing_sqm,
//       finishing_id: finishingSaved._id,
//       tapping_id: finishingSaved.tapping_id,
//       ready_sheet_form_inventory_id:
//         finishingSaved.ready_sheet_form_inventory_id,
//       ready_sheet_form_history_id: finishingSaved.ready_sheet_form_history_id,
//       pressing_id: finishingSaved.pressing_id,
//       created_employee_id: authUserDetail._id,
//       issued_for_finishing_id: data.issued_for_finishing_id,
//     });

//     const qcDoneSaved = await qcDone.save({ session });

//     const IssuedForFinishingDetails = await IssuedForFinishingModel.findById(
//       data.issued_for_finishing_id
//     );
//     if (
//       IssuedForFinishingDetails.available_pressed_pcs -
//         data.finishing_no_of_pcs ==
//       0
//     ) {
//       IssuedForFinishingDetails.revert_status = "inactive";
//     }
//     IssuedForFinishingDetails.available_pressed_pcs -= data.finishing_no_of_pcs;
//     await IssuedForFinishingDetails.save({
//       session,
//       validateBeforeSave: false,
//     });

//     await session.commitTransaction();
//     session.endSession();

//     res.status(200).json({
//       status: true,
//       message: "Finishing created successfully.",
//       data: { finishingSaved, qcDoneSaved },
//     });
//   } catch (error) {
//     if (session) {
//       await session.abortTransaction();
//       session.endSession();
//       if (req.files) {
//         const fileFields = Object.keys(req.files);
//         fileFields.forEach((field) => {
//           const uploadedFiles = req.files[field];
//           if (uploadedFiles && uploadedFiles.length > 0) {
//             uploadedFiles.forEach((file) => {
//               fs.unlinkSync(file.path);
//             });
//           }
//         });
//       }
//     }
//     console.error("Error:", error);
//     return res.status(500).json({
//       status: false,
//       message: "Internal server error occurred while processing the request.",
//       error: error.message,
//     });
//   }
// });

export const createFinishing = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const finishing_details = JSON?.parse(req.body.finishing_details);

    const imageFilenames = req?.files?.finishing_images?.map(
      (file) => file?.filename
    );
    const data = {
      ...req.body,
      created_employee_id: authUserDetail._id,
    };

    const isIssued = await IssuedForFinishingModel.findById(
      data.issued_for_finishing_id
    );
    if (!isIssued) {
      throw new Error("Issued For Finishing not found");
    }

    if (imageFilenames?.length > 0) {
      const groupNo = req.body.group_no;
      const existingDocument = await GroupImagesModel.findOne({
        group_no: groupNo,
      }).session(session);
      if (existingDocument) {
        await GroupImagesModel.findOneAndUpdate(
          { group_no: groupNo },
          { $push: { finishing_images: { $each: imageFilenames } } },
          { upsert: true, new: true, session }
        );
      } else {
        await GroupImagesModel.create(
          [
            {
              finishing_images: imageFilenames,
              group_no: groupNo,
            },
          ],
          { session }
        );
      }
    }
    const finishingDocuments = [];
    finishing_details.forEach((e) => {
      const finishingData = {
        ...data,
        finishing_no_of_pcs: e.finishing_no_of_pcs,
        finishing_length: e.finishing_length,
        finishing_width: e.finishing_width,
        finishing_sqm: e.finishing_sqm,
        finishing_waste_sqm: {
          waste_sqm: e.finishing_wastage_sqm,
          waste_sqm_percentage: e.finishing_wastage_percentage,
        },
      };
      finishingDocuments.push(finishingData);
    });

    const finishingSaved = await FinishingModel.insertMany(finishingDocuments, {
      session,
    });

    const QcDone = finishingSaved.map((e, index) => ({
      group_no: e.group_no,
      qc_no_of_pcs_available: e.finishing_no_of_pcs,
      qc_length: e.finishing_length,
      qc_width: e.finishing_width,
      qc_sqm: e.finishing_sqm,
      finishing_id: e._id,
      tapping_id: e.tapping_id,
      ready_sheet_form_inventory_id: e.ready_sheet_form_inventory_id,
      ready_sheet_form_history_id: e.ready_sheet_form_history_id,
      pressing_id: e.pressing_id,
      created_employee_id: authUserDetail._id,
      issued_for_finishing_id: data.issued_for_finishing_id,
    }));

    const qcDoneSaved = await QcDoneInventoryModel.insertMany(QcDone, {
      session,
    });

    const IssuedForFinishingDetails = await IssuedForFinishingModel.findById(
      data.issued_for_finishing_id
    );

    const noOfPieces = finishingDocuments.reduce(
      (acc, ele) => acc + Number(ele.finishing_no_of_pcs),
      0
    );

    if (IssuedForFinishingDetails.available_pressed_pcs - noOfPieces == 0) {
      IssuedForFinishingDetails.revert_status = "inactive";
    }
    IssuedForFinishingDetails.available_pressed_pcs =
      IssuedForFinishingDetails.available_pressed_pcs - Number(noOfPieces);

    await IssuedForFinishingDetails.save({
      session,
      validateBeforeSave: false,
    });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: true,
      message: "Finishing created successfully.",
      data: { finishingSaved, qcDoneSaved },
    });
  } catch (error) {
    if (session) {
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
    }
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error occurred while processing the request.",
      error: error.message,
    });
  }
});

export const ListFinishingDone = catchAsync(async (req, res, next) => {
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
    matchQuery["created_at"] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const totalDocuments = await FinishingModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingView =
    mongoose.connection.db.collection("finishings_view");
  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
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
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForFinishingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const RevertIssuedForFinishing = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { issuedId } = req.query;
    const IssuedForFinishingView = mongoose.connection.db.collection(
      "issued_for_finishings_view"
    );
    const IssuedForFinishingDetails = await IssuedForFinishingView.findOne({
      _id: new mongoose.Types.ObjectId(issuedId),
    });
    if (
      IssuedForFinishingDetails.available_pressed_pcs !=
      IssuedForFinishingDetails.pressing_details.pressing_no_of_peices
    ) {
      throw new Error("Revert cannot be done");
    }
    const pressingDetails = await PressingModel.findOne({
      _id: IssuedForFinishingDetails.pressing_id,
    });
    for (const item of pressingDetails.consumed_details) {
      await OtherGoodsModel.findOneAndUpdate(
        { _id: item.item_id },
        { $inc: { available_quantity: item.consumed_quantity } }
      );
      // Delete the consumed details document
      await OtherGoodsConsumedModel.findByIdAndDelete({
        _id: item.other_goods_consumed_id,
      });
    }

    await IssuedForPressingModel.findByIdAndUpdate(
      IssuedForFinishingDetails.issued_for_pressing_id, // ID of the document to update
      { $set: { revert_status: "active" } }, // Update object
      { session, new: true } // Options object to return the updated document
    );

    const PressingDelete = await PressingModel.findByIdAndDelete(
      IssuedForFinishingDetails.pressing_details._id,
      { session }
    );
    const IssuedForFinishingDelete =
      await IssuedForFinishingModel.findByIdAndDelete(issuedId, { session });

    await session.commitTransaction();
    session.endSession();
    return res.json({
      message: "success",
      result: "Reverted Successfully",
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return res.status(500).json({
      status: false,
      message: "Error occurred while reverting",
      error: error.message,
    });
  }
});
