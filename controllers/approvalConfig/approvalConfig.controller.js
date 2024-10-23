import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import ApprovalConfigModel from "../../database/schema/ApprovalConfig/approvalConfig.schema.js";

export const AddApprovalConfigMaster = catchAsync(async (req, res) => {
  const approvalConfigData = {
    configuration: {
      log_inventory: {
        edit: false,
      },
      flitch_inventory: {
        edit: false,
      },
      plywood_inventory: {
        edit: false,
      },
      veneer_inventory: {
        edit: false,
      },
      mdf_inventory: {
        edit: false,
      },
      face_inventory: {
        edit: false,
      },
      core_inventory: {
        edit: false,
      },
      fleece_inventory: {
        edit: false,
      },
      otherGoods_inventory: {
        edit: false,
      },
      crosscut_factory: {
        edit: false,
      },
      flitching_factory: {
        edit: false,
      },
    },
    created_employee_id: "66d6b301414c6838b6a7dba5",
  };
  const newApprovalConfigList = new ApprovalConfigModel(approvalConfigData);
  const savedApprovalConfig = await newApprovalConfigList.save();
  return res.status(201).json({
    result: savedApprovalConfig,
    status: true,
    message: "ApprovalConfig created successfully",
  });
});

export const UpdateApprovalConfigMaster = catchAsync(async (req, res) => {
  const Id = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(Id)) {
    return res.status(400).json({ result: [], status: false, message: "Invalid ApprovalConfig ID" });
  }
  const user = await ApprovalConfigModel.findByIdAndUpdate(Id, { $set: updateData }, { new: true, runValidators: true });
  if (!user) {
    return res.status(404).json({
      result: [],
      status: false,
      message: "Id not found.",
    });
  }
  res.status(200).json({
    result: user,
    status: true,
    message: "Updated successfully",
  });
});

export const ListApprovalConfigMaster = catchAsync(async (req, res) => {
  const approvalConfigList = await ApprovalConfigModel.find();

  if (approvalConfigList) {
    return res.status(200).json({
      result: approvalConfigList,
      status: true,
      message: "All ApprovalConfig List",
    });
  }
});
