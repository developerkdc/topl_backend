import mongoose from "mongoose";
import { IssuedForCuttingModel } from "../../database/schema/cutting/issuedForCutting.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";
import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import { GroupHistoryModel } from "../../database/schema/group/groupHistory/groupHistory.schema.js";
import GroupImagesModel from "../../database/schema/images/groupImages.schema.js";
import { CuttingModel } from "../../database/schema/cutting/cutting.js";

export const FetchIssuedForCutting = catchAsync(async (req, res, next) => {
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
    matchQuery["created_at"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const totalDocuments = await IssuedForCuttingModel.aggregate([
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
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        pipeline: [
          {
            $lookup: {
              from: "raw_materials",
              localField: "item_details",
              foreignField: "_id",
              as: "item_details",
            },
          },
        ],
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
        localField: "cutting_item_details.item_id",
        foreignField: "_id",
        as: "raw_materials_data",
      },
    },
    {
      $addFields: {
        cutting_item_details: {
          $map: {
            input: "$cutting_item_details",
            as: "detail",
            in: {
              $mergeObjects: [
                "$$detail",
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$raw_materials_data",
                        as: "material",
                        cond: { $eq: ["$$material._id", "$$detail.item_id"] },
                      },
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        raw_materials_data: 0,
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

  const issuedForGroupingData = await IssuedForCuttingModel.aggregate([
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
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        pipeline: [
          {
            $lookup: {
              from: "raw_materials",
              localField: "item_details",
              foreignField: "_id",
              as: "item_details",
            },
          },
        ],
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
        localField: "cutting_item_details.item_id",
        foreignField: "_id",
        as: "raw_materials_data",
      },
    },
    {
      $addFields: {
        cutting_item_details: {
          $map: {
            input: "$cutting_item_details",
            as: "detail",
            in: {
              $mergeObjects: [
                "$$detail",
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$raw_materials_data",
                        as: "material",
                        cond: { $eq: ["$$material._id", "$$detail.item_id"] },
                      },
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        raw_materials_data: 0,
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
    result: issuedForGroupingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

// export const RevertIssuedForCutting = catchAsync(async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   const { issuedId } = req.query;
//   try {
//     let group_no_of_pattas_available = 0;
//     let total_item_sqm_available = 0;
//     // Fetch the group details

//     const IssuedForCuttingView = mongoose.connection.db.collection(
//       "issued_for_cuttings_view"
//     );
//     const IssuedForCuttingDetails = await IssuedForCuttingView.findOne({
//       _id: new mongoose.Types.ObjectId(issuedId),
//     });
//     if (!IssuedForCuttingDetails) {
//       return res.json({
//         status: false,
//         message: "Issued For Cutting Not Found",
//       });
//     }

//     // // Validate cutting quantities against available quantities
//     for (const item of IssuedForCuttingDetails.cutting_item_details) {
//       const rawMaterial = await RawMaterialModel.findById(item.item_id);
//       if (!rawMaterial) {
//         return res.json({
//           status: false,
//           message: "Invalid item ID",
//         });
//       }

//       //   // Update available quantities by reducing the cutting quantities
//       rawMaterial.item_available_quantities.natural +=
//         item.cutting_quantity.natural;
//       rawMaterial.item_available_quantities.dyed += item.cutting_quantity.dyed;
//       rawMaterial.item_available_quantities.smoked +=
//         item.cutting_quantity.smoked;
//       rawMaterial.item_available_quantities.total +=
//         item.cutting_quantity.total;

//       //   // Save the updated raw material document
//       rawMaterial.item_available_pattas += item.cutting_quantity.total;
//       group_no_of_pattas_available += item.cutting_quantity.total;
//       const calculation =
//         (item.cutting_quantity.total *
//           rawMaterial.item_length *
//           rawMaterial.item_width) /
//         10000;
//       rawMaterial.item_available_sqm += calculation;
//       total_item_sqm_available += calculation;
//       //   // Convert item_available_sqm back to a floating-point number with 2 decimal places
//       rawMaterial.item_available_sqm = parseFloat(
//         rawMaterial.item_available_sqm.toFixed(2)
//       );

//       total_item_sqm_available = parseFloat(
//         total_item_sqm_available.toFixed(2)
//       );

//       await rawMaterial.save({ session, validateBeforeSave: false });
//     }

//     // // Update group data
//     const updatedGroupData = await GroupModel.findOneAndUpdate(
//       { _id: IssuedForCuttingDetails.group_id._id },
//       {
//         $inc: {
//           group_no_of_pattas_available: group_no_of_pattas_available,
//           total_item_sqm_available: total_item_sqm_available,
//         },
//         $set: {
//           status: "available",
//         },
//       },
//       { new: true, session }
//     );

//     //group history and issued for cutting to be deleted
//     await GroupHistoryModel.findByIdAndDelete(
//       IssuedForCuttingDetails.group_history_id._id
//     ).session(session);
//     await IssuedForCuttingModel.findByIdAndDelete(
//       IssuedForCuttingDetails._id
//     ).session(session);

//     await session.commitTransaction();
//     session.endSession();

//     // Send success response
//     res.status(200).json({
//       message: "Issued For Cutting Reverted successfully",
//       statusCode: 200,
//       status: "success",
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(400).json({ message: error.message });
//   }
// });

export const RevertIssuedForCutting = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { issuedId } = req.query;
  console.log(issuedId,'issuedId');

  try {
    let group_no_of_pattas_available = 0;
    let total_item_sqm_available = 0;
    // Fetch the group details

    const IssuedForCuttingView = mongoose.connection.db.collection(
      "issued_for_cuttings_view"
    );
    const IssuedForCuttingDetails = await IssuedForCuttingView.findOne({
      _id: new mongoose.Types.ObjectId(issuedId),
    });
    console.log(IssuedForCuttingDetails,'IssuedForCuttingDetails');
    if (!IssuedForCuttingDetails) {
      return res.json({
        status: false,
        message: "Issued For Cutting Not Found",
      });
    }
    let arr = [];
    // // Validate cutting quantities against available quantities
    for (const item of IssuedForCuttingDetails.cutting_item_details) {
      const rawMaterial = await RawMaterialModel.findById(item.item_id);
      if (!rawMaterial) {
        return res.json({
          status: false,
          message: "Invalid item ID",
        });
      }

      //   // Update available quantities by reducing the cutting quantities
      // rawMaterial.item_available_quantities.natural +=
      //   item.cutting_quantity.natural;
      // rawMaterial.item_available_quantities.dyed += item.cutting_quantity.dyed;
      // rawMaterial.item_available_quantities.smoked +=
      //   item.cutting_quantity.smoked;
      // rawMaterial.item_available_quantities.total +=
      //   item.cutting_quantity.total;

      //   // Save the updated raw material document
      rawMaterial.item_available_pattas += item.cutting_quantity;
      group_no_of_pattas_available += item.cutting_quantity;
      const calculation =
        (item.cutting_quantity *
          rawMaterial.item_length *
          rawMaterial.item_width) /
        10000;
      rawMaterial.item_available_sqm += calculation;
      total_item_sqm_available += calculation;
      //   // Convert item_available_sqm back to a floating-point number with 2 decimal places
      rawMaterial.item_available_sqm = parseFloat(
        rawMaterial.item_available_sqm.toFixed(2)
      );

      total_item_sqm_available = parseFloat(
        total_item_sqm_available.toFixed(2)
      );
      arr.push(rawMaterial);
      console.log(arr,'varr');
      await rawMaterial.save({ session, validateBeforeSave: false });
    }

    // // Update group data
    const updatedGroupData = await GroupModel.findOneAndUpdate(
      { _id: IssuedForCuttingDetails.group_id._id },
      {
        $inc: {
          group_no_of_pattas_available: group_no_of_pattas_available,
          total_item_sqm_available: total_item_sqm_available,
        },
        $set: {
          status: "available",
        },
      },
      { new: true, session }
    );

    //group history and issued for cutting to be deleted
    await GroupHistoryModel.findByIdAndDelete(
      IssuedForCuttingDetails.group_history_id._id
    ).session(session);
    await IssuedForCuttingModel.findByIdAndDelete(
      IssuedForCuttingDetails._id
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    // Send success response
    res.status(200).json({
      message: "Issued For Cutting Reverted successfully",
      statusCode: 200,
      status: "success",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ message: error.message });
  }
});
