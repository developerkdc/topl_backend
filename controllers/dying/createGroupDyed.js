import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import { IssuedForDyingGroupModel } from "../../database/schema/dying/issueForDyingGroup.js";
import { GroupDyingModel } from "../../database/schema/dying/groupDying.js";
import GroupImagesModel from "../../database/schema/images/groupImages.schema.js";
import fs from "fs";
import OtherGoodsModel from "../../database/schema/inventory/otherGoods/otherGoods.schema.js";
import OtherGoodsConsumedModel from "../../database/schema/inventory/otherGoods/otherGoodsConsumed.schema.js";

export const CreateGroupDyed = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction
  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const bodyData = req.body;
    const imageFilenames = req.files
      ? req.files.dying_images?.map((file) => file.filename)
      : [];

    const group_details = JSON?.parse(bodyData?.group_data);

    const extracted_group_details = group_details
      ?.map((obj) => obj.group_details)
      .flat();

    const issuedForDyingIndividualItemsExist =
      await IssuedForDyingGroupModel.find({
        _id: { $in: extracted_group_details },
      })
        .populate("group_id")
        .session(session);

    if (
      issuedForDyingIndividualItemsExist.length !=
      extracted_group_details.length
    ) {
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
        Number(bodyData.liters_of_ammonia_used) * group_details?.length
    ) {
      return res.status(400).json({
        status: false,
        message: `Insufficient consumable quantity.`,
      });
    }

    if (imageFilenames?.length > 0) {
      for (const GroupId of issuedForDyingIndividualItemsExist) {
        const groupNo = GroupId.group_id.group_no;

        const existingDocument = await GroupImagesModel.findOne({
          group_no: groupNo,
        }).session(session);

        if (existingDocument) {
          await GroupImagesModel.findOneAndUpdate(
            { group_no: groupNo },
            { $push: { dying_images: { $each: imageFilenames } } },
            { upsert: true, new: true, session }
          );
        } else {
          await GroupImagesModel.create(
            [
              {
                dying_images: imageFilenames,
                group_no: groupNo,
              },
            ],
            { session }
          );
        }
      }
    }

    // // Create documents for dying group items

    const DyingGroup = issuedForDyingIndividualItemsExist?.map((e) => ({
      group_id: e.group_id._id,
      item_details: e.group_id.item_details,
      date_of_dying: bodyData.date_of_dying,
      in_time: bodyData.in_time,
      issued_for_dying_date: bodyData.issued_for_dying_date,
      process_time: bodyData.process_time,
      out_time: bodyData.out_time,
      consumed_item_name: bodyData?.consumed_item_name,
      consumed_item_name_id: bodyData?.consumed_item_name_id,
      liters_of_ammonia_used: bodyData.liters_of_ammonia_used,
      group_dying_remarks: bodyData?.group_dying_remarks,
      dying_images: imageFilenames,
      created_employee_id: authUserDetail._id,
    }));

    // Insert Dying Group items into the GroupDyingModel
    const saveData = await GroupDyingModel.insertMany(DyingGroup, {
      session,
    });

    // // if create Dying Group items doen delete item from issued Individual smoke model
    // if (saveData) {
    //   await IssuedForDyingGroupModel.deleteMany({
    //     _id: { $in: extracted_group_details },
    //   }).session(session);
    // }
    if (saveData) {
      await IssuedForDyingGroupModel.updateMany(
        { _id: { $in: extracted_group_details } },
        { $set: { status: "dyed" } }
      ).session(session);
    }

    // updating other goods quantities
    let otherGoods = await OtherGoodsModel.find({
      item_name: bodyData?.consumed_item_name,
    }).sort({ created_at: 1 });

    let remainingQuantity =
      Number(bodyData.liters_of_ammonia_used) * group_details?.length;

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
        processes: "Group Dying",
        supplier_details: updatedOtherGoods?.supplier_details,
        other_goods_consumed_remarks: bodyData?.consumption_remark,
        created_employee_id: authUserDetail?._id,
        other_goods_remarks: updatedOtherGoods?.other_goods_remarks,
      };

      await OtherGoodsConsumedModel.create([newConsumedObject], { session });

      remainingQuantity -= consumeFromItem;

      // this is to give some time to OtherGoodsConsumedModel.create action
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Create Group dying successful",
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
