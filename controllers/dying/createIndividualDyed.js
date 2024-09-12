import mongoose from "mongoose";
import { IssuedForDyingIndividualModel } from "../../database/schema/dying/issuedForDyingIndividual.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { IndividualDyingModel } from "../../database/schema/dying/individualDying.js";
import RawImagesModel from "../../database/schema/images/rawImages.schema.js";
import fs from "fs";
import OtherGoodsModel from "../../database/schema/inventory/otherGoods/otherGoods.schema.js";
import OtherGoodsConsumedModel from "../../database/schema/inventory/otherGoods/otherGoodsConsumed.schema.js";
// export const CreateIndividualDyed = catchAsync(async (req, res, next) => {
//   // Start a MongoDB session
//   const session = await mongoose.startSession();
//   // Start a transaction
//   try {
//     session.startTransaction();
//     const authUserDetail = req.userDetails;
//     //
//     const bodyData = req.body;
//     const imageFilenames = req.files
//       ? req.files.dying_images.map((file) => file.filename)
//       : [];
//     console.log(req.files, "filessss");
//     const item_details = JSON.parse(bodyData.item_details);
//     //
//     console.log(bodyData.item_details,"dsasdawd")
//     const issuedForDyingIndividualItemsExist =
//       await IssuedForDyingIndividualModel.find({
//         _id: { $in: item_details },
//       }).session(session);

//     if (issuedForDyingIndividualItemsExist.length != item_details.length) {
//       return res.status(400).json({
//         status: false,
//         message: "Item not available",
//       });
//     }
//     if (imageFilenames?.length > 0) {
//       for (const itemId of issuedForDyingIndividualItemsExist) {
//         const existingDocument = await RawImagesModel.findOne({
//           itemId,
//         }).session(session);
//         if (existingDocument) {
//           await RawImagesModel.findOneAndUpdate(
//             { itemId },
//             { $push: { dying_images: { $each: imageFilenames } } },
//             { upsert: true, new: true, session }
//           );
//         } else {
//           await RawImagesModel.create(
//             [
//               {
//                 dying_images: imageFilenames,
//                 item_details: itemId,
//               },
//             ],
//             { session }
//           );
//         }
//       }
//     }

//     // Create documents for Smoking Individual items

//     const dyingIndividual = issuedForDyingIndividualItemsExist.map((e) => ({
//       // issued_individual_smoking_id: e._id,
//       item_details: e.item_id,
//       issued_dying_quantity: e.issued_dying_quantity,
//       date_of_dying: bodyData.date_of_dying,
//       in_time: bodyData.in_time,
//       issued_for_dying_date: bodyData.issued_for_dying_date,
//       process_time: bodyData.process_time,
//       out_time: bodyData.out_time,
//       liters_of_ammonia_used: bodyData.liters_of_ammonia_used,
//       dying_images: imageFilenames,
//       created_employee_id: authUserDetail._id,
//     }));

//     // Insert Smoking Individual items into the IndividualDyingModel
//     const saveData = await IndividualDyingModel.insertMany(dyingIndividual, {
//       session,
//     });

//     // if create Smoking Individual items doen delete item from issued Individual smoke model
//     // if (saveData) {
//     //   await IssuedForDyingIndividualModel.deleteMany({
//     //     _id: { $in: item_details },
//     //   }).session(session);
//     // }
//     if (saveData) {
//       await IssuedForDyingIndividualModel.updateMany(
//         { _id: { $in: item_details } },
//         { $set: { status: "dyed" } }
//       ).session(session);
//     }

//     // Commit the transaction
//     await session.commitTransaction();
//     session.endSession();

//     return res.json({
//       status: true,
//       message: "create individual dying successful",
//     });
//   } catch (error) {
//     // Rollback the transaction if there is any error
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
//     return res.status(500).json({ error: error.message });
//   }
// });

export const CreateIndividualDyed = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction
  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const bodyData = req.body;
    const imageFilenames = req?.files
      ? req?.files?.dying_images?.map((file) => file.filename)
      : [];

    const item_details = JSON.parse(bodyData.item_details);

    const issuedForDyingIndividualItemsExist =
      await IssuedForDyingIndividualModel.find({
        item_id: { $in: item_details },
      }).session(session);

    if (issuedForDyingIndividualItemsExist.length != item_details.length) {
      return res.status(400).json({
        status: false,
        message: "Item not available",
      });
    }

    // finding wether consumable is available or not
    const availableConsumedItem = await OtherGoodsModel.aggregate([
      {
        $match: {
          item_name: bodyData?.consumed_item_name,
        },
      },
      {
        $group: {
          _id: "$item_name",
          totalAvailable: {
            $sum: "$available_quantity",
          },
        },
      },
    ]);
    // console.log(availableConsumedItem, "16000");
    if (
      availableConsumedItem.length <= 0 ||
      availableConsumedItem[0].totalAvailable <
        Number(bodyData.liters_of_ammonia_used) *
          issuedForDyingIndividualItemsExist?.length
    ) {
      return res.status(400).json({
        status: false,
        message: `Insufficient consumable quantity.`,
      });
    }

    if (imageFilenames && imageFilenames?.length > 0) {
      for (const itemId of issuedForDyingIndividualItemsExist) {
        const existingDocument = await RawImagesModel.findOne({
          item_id: itemId.item_id,
        }).session(session);
        if (existingDocument) {
          await RawImagesModel.findOneAndUpdate(
            { item_id: itemId.item_id },
            { $push: { dying_images: { $each: imageFilenames } } },
            { upsert: true, new: true, session }
          );
        } else {
          await RawImagesModel.create(
            [
              {
                dying_images: imageFilenames,
                item_details: itemId.item_id,
              },
            ],
            { session }
          );
        }
      }
    } else {
      for (const itemId of issuedForDyingIndividualItemsExist) {
        await RawImagesModel.create(
          [
            {
              dying_images: [],
              item_details: itemId.item_id,
            },
          ],
          { session }
        );
      }
    }

    // Create documents for Smoking Individual items

    const dyingIndividual = issuedForDyingIndividualItemsExist?.map((e) => ({
      // issued_individual_smoking_id: e._id,
      item_details: e.item_id,
      issued_dying_quantity: e.issued_dying_quantity,
      date_of_dying: bodyData.date_of_dying,
      in_time: bodyData.in_time,
      issued_for_dying_date: bodyData.issued_for_dying_date,
      process_time: bodyData.process_time,
      out_time: bodyData.out_time,
      consumed_item_name: bodyData?.consumed_item_name,
      consumed_item_name_id: bodyData?.consumed_item_name_id,
      liters_of_ammonia_used: bodyData.liters_of_ammonia_used,
      individual_dying_remarks: bodyData?.individual_dying_remarks,
      dying_images: imageFilenames,
      created_employee_id: authUserDetail._id,
    }));

    // Insert Smoking Individual items into the IndividualDyingModel
    const saveData = await IndividualDyingModel.insertMany(dyingIndividual, {
      session,
    });

    // if create Smoking Individual items doen delete item from issued Individual smoke model
    // if (saveData) {
    //   await IssuedForDyingIndividualModel.deleteMany({
    //     _id: { $in: item_details },
    //   }).session(session);
    // }
    if (saveData) {
      await IssuedForDyingIndividualModel.updateMany(
        { item_id: { $in: item_details } },
        { $set: { status: "dyed" } }
      ).session(session);
    }

    // updating other goods quantities
    let otherGoods = await OtherGoodsModel.find({
      item_name: bodyData?.consumed_item_name,
    }).sort({ created_at: 1 });

    let remainingQuantity =
      Number(bodyData.liters_of_ammonia_used) *
      issuedForDyingIndividualItemsExist?.length;

    // looping through all inward for the selected consumable item
    for (let item of otherGoods) {
      if (remainingQuantity <= 0) break;

      const consumeFromItem = Math.min(
        item.available_quantity,
        remainingQuantity
      );

      // Update the item's available_quantity in other goods collection
      let updatedOtherGoods = await OtherGoodsModel.findByIdAndUpdate(
        { _id: item._id },
        {
          $inc: { available_quantity: -consumeFromItem },
          $set: {
            updated_at: Date.now(),
          },
        },
        { new: true, session }
      ).lean();

      let newConsumedObject = {
        date_of_inward: updatedOtherGoods?.date_of_inward,
        item_name: updatedOtherGoods?.item_name,
        units: updatedOtherGoods?.units,
        rate: updatedOtherGoods?.rate,
        received_quantity: updatedOtherGoods?.received_quantity,
        available_quantity: updatedOtherGoods?.available_quantity,
        date_of_consumption: bodyData?.date_of_dying,
        consumption_quantity: consumeFromItem,
        processes: "Individual Dying",
        supplier_details: updatedOtherGoods?.supplier_details,
        other_goods_consumed_remarks: bodyData?.consumption_remark,
        created_employee_id: authUserDetail?._id,
        other_goods_remarks: updatedOtherGoods?.other_goods_remarks,
      };
      // updatedOtherGoods.consumed_quantity = consumeFromItem;
      // console.log(updatedOtherGoods,updatedOtherGoods.consumed_quantity,"269");
      // totalUpdatedOtherGoods.push(updatedOtherGoods)

      // add this consumed entry in other_goods_issued collection
      // console.log(newConsumedObject, "292");
      await OtherGoodsConsumedModel.create([newConsumedObject], { session });

      remainingQuantity -= consumeFromItem;
      // this is to give some time to OtherGoodsConsumedModel.create action
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "create individual dying successful",
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
    return res.status(500).json({ error: error.message });
  }
});
