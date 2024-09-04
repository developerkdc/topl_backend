import mongoose from "mongoose";
import { CuttingModel } from "../../database/schema/cutting/cutting.js";
import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import { GroupHistoryModel } from "../../database/schema/group/groupHistory/groupHistory.schema.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { IssuedForCuttingModel } from "../../database/schema/cutting/issuedForCutting.js";
import { IssueForTapingModel } from "../../database/schema/taping/issuedTaping.schema.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import GroupImagesModel from "../../database/schema/images/groupImages.schema.js";
import fs from "fs";
// export const CreateCutting = catchAsync(async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const authUserDetail = req.userDetails;
//     const bodyData = {
//       ...req.body,
//       created_employee_id: authUserDetail,
//     };
//     const checkIfIssued = await IssuedForCuttingModel.findById(
//       bodyData.issued_for_cutting_id
//     );
//     if (!checkIfIssued) {
//       return res.json({
//         success: false,
//         message: "Issued for cutting not found",
//       });
//     }
//     const GroupHistoryData = await GroupHistoryModel.findById(
//       bodyData.group_history_id
//     );
//     for (const [
//       index,
//       item,
//     ] of GroupHistoryData.cutting_item_details.entries()) {
//       const rawMaterial = await RawMaterialModel.findById(item.item_id);
//       console.log(bodyData["item_details"][index], ">>>>>>>>>>>>>>>>>>>>>>>>>");

//       let natural =
//         item.cutting_quantity.natural -
//         bodyData["item_details"][index].final_cutting_quantity.natural;
//       let dyed =
//         item.cutting_quantity.dyed -
//         bodyData["item_details"][index].final_cutting_quantity.dyed;
//       let smoked =
//         item.cutting_quantity.smoked -
//         bodyData["item_details"][index].final_cutting_quantity.smoked;
//       let total =
//         item.cutting_quantity.total -
//         bodyData["item_details"][index].final_cutting_quantity.total;

//       rawMaterial.item_available_quantities = {
//         natural: rawMaterial.item_available_quantities.natural + natural,
//         dyed: rawMaterial.item_available_quantities.dyed + dyed,
//         smoked: rawMaterial.item_available_quantities.smoked + smoked,
//         total: rawMaterial.item_available_quantities.total + total,
//       };

//       rawMaterial.item_available_pattas =
//         rawMaterial.item_available_quantities.total + total;
//       rawMaterial.item_available_sqm =
//         (rawMaterial.item_length *
//           rawMaterial.item_width *
//           (rawMaterial.item_available_quantities.total + total)) /
//         10000;

//       await rawMaterial.save();

//       item.cutting_quantity =
//         bodyData["item_details"][index].final_cutting_quantity;
//     }
//     await GroupHistoryData.save();

//     const GroupForUpdate = await GroupModel.findById(bodyData.group_id);
//     const rawMaterials = await RawMaterialModel.find({
//       _id: { $in: GroupForUpdate.item_details.map((item) => item) },
//     });

//     // Calculate the total sum of item_available_pattas
//     const totalPattas = rawMaterials.reduce(
//       (sum, rawMaterial) => sum + rawMaterial.item_available_pattas,
//       0
//     );

//     // Update the GroupModel with the total sum
//     await GroupModel.updateOne(
//       { _id: bodyData.group_id },
//       { group_no_of_pattas_available: totalPattas }
//     );
//     const updatedGroup = await GroupModel.findByIdAndUpdate(
//       { _id: bodyData.group_id },
//       {
//         $set: {
//           group_no_of_pattas_available: totalPattas,
//           total_item_sqm_available:
//             (GroupForUpdate.group_length *
//               GroupForUpdate.group_width *
//               totalPattas) /
//             10000,
//         },
//       },
//       { new: true }
//     );
//     for (const item of bodyData.item_details) {
//       const updateGroupHistory = await GroupHistoryModel.findByIdAndUpdate(
//         {
//           _id: bodyData.group_history_id,
//           "item_details.cutting_quantity": item.final_cutting_quantity,
//           updated_at: Date.now,
//         },
//         { new: true }
//       );
//     }

//     const cutting = new CuttingModel(bodyData);
//     const cuttingData = await cutting.save();

//     const deleteIssuedForCutting =
//       await IssuedForCuttingModel.findByIdAndDelete(
//         bodyData.issued_for_cutting_id
//       );
//     const tapingData = {
//       cutting_id: cuttingData._id,
//       created_employee_id: authUserDetail,
//     };
//     const issuedForTaping = new IssueForTapingModel(tapingData);
//     await issuedForTaping.save();
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       result: cutting,
//       status: true,
//       message: "Cutting done successfully",
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(500).json({
//       status: false,
//       message: "Error occurred while cutting",
//       error: error.message,
//     });
//   }
// });

export const FetchCuttingDone = catchAsync(async (req, res, next) => {
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
    matchQuery["cutting_date"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const totalDocuments = await CuttingModel.aggregate([
    {
      $lookup: {
        from: "group_histories", // Name of the collection you're referencing
        localField: "group_history_id",
        foreignField: "_id", // Assuming group_id references the _id field of the GroupModel
        as: "group_history_id", // Output array will be named "group"
      },
    },
    {
      $unwind: {
        path: "$group_history_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "raw_materials", // Name of the collection you're referencing
        localField: "group_history_id.cutting_item_details.item_id",
        foreignField: "_id", // Assuming item_id references the _id field of the raw_materials collection
        as: "raw_materials", // Output array will be named "raw_materials"
      },
    },
    {
      $addFields: {
        "group_history_id.cutting_item_details": {
          $map: {
            input: "$group_history_id.cutting_item_details",
            as: "detail",
            in: {
              $mergeObjects: [
                "$$detail",
                {
                  $arrayElemAt: [
                    "$raw_materials",
                    {
                      $indexOfArray: ["$raw_materials._id", "$$detail.item_id"],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $unset: "raw_materials", // Remove the temporary field after reshaping
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

  const rawVeneerData = await CuttingModel.aggregate([
    {
      $lookup: {
        from: "group_histories", // Name of the collection you're referencing
        localField: "group_history_id",
        foreignField: "_id", // Assuming group_id references the _id field of the GroupModel
        as: "group_history_id", // Output array will be named "group"
      },
    },
    {
      $unwind: {
        path: "$group_history_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "raw_materials", // Name of the collection you're referencing
        localField: "group_history_id.cutting_item_details.item_id",
        foreignField: "_id", // Assuming item_id references the _id field of the raw_materials collection
        as: "raw_materials", // Output array will be named "raw_materials"
      },
    },
    {
      $addFields: {
        "group_history_id.cutting_item_details": {
          $map: {
            input: "$group_history_id.cutting_item_details",
            as: "detail",
            in: {
              $mergeObjects: [
                "$$detail",
                {
                  $arrayElemAt: [
                    "$raw_materials",
                    {
                      $indexOfArray: ["$raw_materials._id", "$$detail.item_id"],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $unset: "raw_materials", // Remove the temporary field after reshaping
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

// export const CreateCutting = catchAsync(async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const authUserDetail = req.userDetails;
//     const imageFilenames = req?.files?.cutting_images?.map(
//       (file) => file?.filename
//     );
//     const item_details = JSON?.parse(req.body?.item_details);
//     const bodyData = {
//       ...req.body,
//       item_details: item_details,
//       created_employee_id: authUserDetail,
//     };
//     const checkIfIssued = await IssuedForCuttingModel.findById(
//       bodyData.issued_for_cutting_id
//     ).session(session);

//     if (!checkIfIssued) {
//       throw new Error("Issued for cutting not found");
//     }
//     const GroupHistoryData = await GroupHistoryModel.findById(
//       bodyData.group_history_id
//     ).session(session);
//     // console.log(GroupHistoryData, "GroupHistoryData");

//     if (imageFilenames?.length > 0) {
//       const groupNo = GroupHistoryData.group_id.group_no;

//       const existingDocument = await GroupImagesModel.findOne({
//         group_no: groupNo,
//       }).session(session);

//       if (existingDocument) {
//         await GroupImagesModel.findOneAndUpdate(
//           { group_no: groupNo },
//           { $push: { cutting_images: { $each: imageFilenames } } },
//           { upsert: true, new: true, session }
//         );
//       } else {
//         await GroupImagesModel.create(
//           [
//             {
//               cutting_images: imageFilenames,
//               group_no: groupNo,
//             },
//           ],
//           { session }
//         );
//       }
//     }
//     for (const [
//       index,
//       item,
//     ] of GroupHistoryData.cutting_item_details.entries()) {
//       const rawMaterial = await RawMaterialModel.findById(item.item_id).session(
//         session
//       );
//       const finalCuttingQuantity =
//         bodyData["item_details"][index]?.final_cutting_quantity;
//       const cuttingQuantity = item.cutting_quantity;

//       let natural = cuttingQuantity?.natural - finalCuttingQuantity?.natural;
//       let dyed = cuttingQuantity.dyed - finalCuttingQuantity.dyed;
//       let smoked = cuttingQuantity.smoked - finalCuttingQuantity.smoked;
//       let total = cuttingQuantity.total - finalCuttingQuantity.total;

//       rawMaterial.item_available_quantities = {
//         natural: rawMaterial.item_available_quantities.natural + natural,
//         dyed: rawMaterial.item_available_quantities.dyed + dyed,
//         smoked: rawMaterial.item_available_quantities.smoked + smoked,
//         total: rawMaterial.item_available_quantities.total + total,
//       };

//       rawMaterial.item_available_pattas =
//         rawMaterial.item_available_quantities.total;
//       const calculation =
//         (rawMaterial.item_length *
//           rawMaterial.item_width *
//           rawMaterial.item_available_pattas) /
//         10000;
//       rawMaterial.item_available_sqm = calculation;
//       rawMaterial.item_available_sqm = parseFloat(
//         rawMaterial.item_available_sqm
//       ).toFixed(2);
//       console.log(
//         rawMaterial.item_available_sqm,
//         "value after cutting of item"
//       );
//       console.log(
//         typeof rawMaterial.item_available_sqm,
//         "type of value after cutting of item"
//       );
//       // throw new Error("Trial");
//       await rawMaterial.save({ validateBeforeSave: false });
//       item.cutting_quantity = finalCuttingQuantity;
//     }
//     await GroupHistoryData.save({ validateBeforeSave: false });

//     const GroupForUpdate = await GroupModel.findById(bodyData.group_id).session(
//       session
//     );
//     const rawMaterials = await RawMaterialModel.find({
//       _id: { $in: GroupForUpdate.item_details.map((item) => item) },
//     }).session(session);

//     const totalPattas = rawMaterials.reduce(
//       (sum, rawMaterial) => sum + rawMaterial.item_available_pattas,
//       0
//     );

//     const totalsqm = rawMaterials.reduce(
//       (sum, rawMaterial) => sum + rawMaterial.item_available_sqm,
//       0
//     );
//     let status;
//     if (totalPattas > 0) {
//       status = "available";
//     }
//     const updatedGroup = await GroupModel.findByIdAndUpdate(
//       { _id: bodyData.group_id },
//       {
//         $set: {
//           group_no_of_pattas_available: totalPattas,
//           total_item_sqm_available: totalsqm,
//           status,
//         },
//       },
//       { new: true }
//     ).session(session);

//     for (const item of bodyData.item_details) {
//       console.log(item, ">>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<");
//       const updateGroupHistory = await GroupHistoryModel.findByIdAndUpdate(
//         { _id: bodyData.group_history_id },
//         {
//           $set: {
//             "group_id.group_no_of_pattas_available": totalPattas,
//             "item_details.cutting_quantity": item.final_cutting_quantity,
//             "group_id.total_item_sqm_available": totalsqm,
//             updated_at: Date.now(),
//           },
//         },
//         { new: true }
//       ).session(session);
//     }

//     const cutting = new CuttingModel(bodyData);
//     const cuttingData = await cutting.save();

//     await IssuedForCuttingModel.findByIdAndUpdate(
//       { _id: bodyData.issued_for_cutting_id },
//       {
//         $set: {
//           revert_status: "inactive",
//         },
//       },
//       { new: true }
//     ).session(session);

//     const tapingData = {
//       cutting_id: cuttingData._id,
//       issued_for_cutting_id: bodyData.issued_for_cutting_id,
//       created_employee_id: authUserDetail,
//     };
//     const issuedForTaping = new IssueForTapingModel(tapingData);
//     await issuedForTaping.save();

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       result: cutting,
//       status: true,
//       message: "Cutting done successfully",
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     if (req.files) {
//       const fileFields = Object.keys(req.files);
//       fileFields.forEach((field) => {
//         const uploadedFiles = req.files[field];
//         if (uploadedFiles && uploadedFiles.length > 0) {
//           uploadedFiles.forEach((file) => {
//             fs.unlinkSync(file.path);
//           });
//         }
//       });
//     }
//     return res.status(500).json({
//       status: false,
//       message: "Error occurred while cutting",
//       error: error.message,
//     });
//   }
// });

export const CreateCutting = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const authUserDetail = req.userDetails;
    const imageFilenames = req?.files?.cutting_images?.map(
      (file) => file?.filename
    );
    const item_details = JSON?.parse(req.body?.item_details);
    const bodyData = {
      ...req.body,
      item_details: item_details,
      created_employee_id: authUserDetail,
    };
    const checkIfIssued = await IssuedForCuttingModel.findById(
      bodyData.issued_for_cutting_id
    ).session(session);

    if (!checkIfIssued) {
      throw new Error("Issued for cutting not found");
    }

    const GroupHistoryData = await GroupHistoryModel.findById(
      bodyData.group_history_id
    ).session(session);

    if (imageFilenames?.length > 0) {
      const groupNo = GroupHistoryData.group_id.group_no;

      const existingDocument = await GroupImagesModel.findOne({
        group_no: groupNo,
      }).session(session);

      if (existingDocument) {
        await GroupImagesModel.findOneAndUpdate(
          { group_no: groupNo },
          { $push: { cutting_images: { $each: imageFilenames } } },
          { upsert: true, new: true, session }
        );
      } else {
        await GroupImagesModel.create(
          [
            {
              cutting_images: imageFilenames,
              group_no: groupNo,
            },
          ],
          { session }
        );
      }
    }
    for (const [
      index,
      item,
    ] of GroupHistoryData.cutting_item_details.entries()) {
      const rawMaterial = await RawMaterialModel.findById(item.item_id).session(
        session
      );
      const finalCuttingQuantity =
        bodyData["item_details"][index]?.final_cutting_quantity;

      const wasteCuttingQuantity =
        bodyData["item_details"][index]?.waste_cutting_quantity;

      const cuttingQuantity = item.cutting_quantity;

      // let natural = cuttingQuantity?.natural - finalCuttingQuantity?.natural;
      // let dyed = cuttingQuantity.dyed - finalCuttingQuantity.dyed;
      // let smoked = cuttingQuantity.smoked - finalCuttingQuantity.smoked;

      let total =
        cuttingQuantity -
        finalCuttingQuantity -
        wasteCuttingQuantity.waste_pattas;
      console.log(total, "total");

      // if (natural > 0) {
      //   natural -= wasteCuttingQuantity.waste_pattas;
      // } else if (dyed > 0) {
      //   dyed -= wasteCuttingQuantity.waste_pattas;
      // } else if (smoked > 0) {
      //   smoked -= wasteCuttingQuantity.waste_pattas;
      // }

      // rawMaterial.item_available_quantities = {
      //   natural: rawMaterial.item_available_quantities.natural + natural,
      //   dyed: rawMaterial.item_available_quantities.dyed + dyed,
      //   smoked: rawMaterial.item_available_quantities.smoked + smoked,
      //   total: rawMaterial.item_available_quantities.total + total,
      // };

      rawMaterial.item_available_pattas += total;

      const calculation =
        (rawMaterial.item_length *
          rawMaterial.item_width *
          rawMaterial.item_available_pattas) /
        10000;
      console.log(calculation, "calculation");
      rawMaterial.item_available_sqm = calculation;
      rawMaterial.item_available_sqm = parseFloat(
        rawMaterial.item_available_sqm
      ).toFixed(2);
      console.log(rawMaterial, "rawMaterial");

      // throw new Error("Trial");
      await rawMaterial.save({ validateBeforeSave: false });
      item.cutting_quantity = finalCuttingQuantity;
    }
    await GroupHistoryData.save({ validateBeforeSave: false });

    const GroupForUpdate = await GroupModel.findById(bodyData.group_id).session(
      session
    );
    const rawMaterials = await RawMaterialModel.find({
      _id: { $in: GroupForUpdate.item_details.map((item) => item) },
    }).session(session);

    const totalPattas = rawMaterials.reduce(
      (sum, rawMaterial) => sum + rawMaterial.item_available_pattas,
      0
    );

    const totalsqm = rawMaterials.reduce(
      (sum, rawMaterial) => sum + rawMaterial.item_available_sqm,
      0
    );
    let status;
    if (totalPattas > 0) {
      status = "available";
    }
    const updatedGroup = await GroupModel.findByIdAndUpdate(
      { _id: bodyData.group_id },
      {
        $set: {
          group_no_of_pattas_available: totalPattas,
          total_item_sqm_available: totalsqm,
          status,
        },
      },
      { new: true }
    ).session(session);

    for (const item of bodyData.item_details) {

      const updateGroupHistory = await GroupHistoryModel.findByIdAndUpdate(
        { _id: bodyData.group_history_id },
        {
          $set: {
            "group_id.group_no_of_pattas_available": totalPattas,
            "item_details.cutting_quantity": item.final_cutting_quantity,
            "group_id.total_item_sqm_available": totalsqm,
            updated_at: Date.now(),
          },
        },
        { new: true }
      ).session(session);
    }

    const cutting = new CuttingModel(bodyData);
    const cuttingData = await cutting.save();

    await IssuedForCuttingModel.findByIdAndUpdate(
      { _id: bodyData.issued_for_cutting_id },
      {
        $set: {
          revert_status: "inactive",
        },
      },
      { new: true }
    ).session(session);

    const tapingData = {
      cutting_id: cuttingData._id,
      issued_for_cutting_id: bodyData.issued_for_cutting_id,
      created_employee_id: authUserDetail,
    };
    const issuedForTaping = new IssueForTapingModel(tapingData);
    await issuedForTaping.save();

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      result: "cutting",
      status: true,
      message: "Cutting done successfully",
    });
  } catch (error) {
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
      message: "Error occurred while cutting",
      error: error.message,
    });
  }
});
