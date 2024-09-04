import mongoose from "mongoose";
import { CreateReadySheetFormModel } from "../../database/schema/readySheetForm/readySheetForm.schema.js";
import { CreateTappingModel } from "../../database/schema/taping/taping.schema.js";
import { IssueForTapingModel } from "../../database/schema/taping/issuedTaping.schema.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import { ReadySheetFormHistoryModel } from "../../database/schema/readySheetForm/readySheetFormHistory.schema.js";
import { IssuedForPressingModel } from "../../database/schema/pressing/issuedForPressing.schema.js";

export const FetchReadySheetForm = catchAsync(async (req, res, next) => {
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
    matchQuery["taping_done_date"] = { $gte: new Date(from) };
    matchQuery["taping_done_date"] = { $lte: new Date(to) };
  }

  const totalDocuments = await CreateReadySheetFormModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForGroupingData = await CreateReadySheetFormModel.aggregate([
    {
      $lookup: {
        from: "tappings",
        localField: "tapping_id",
        foreignField: "_id",
        as: "tapping_id",
      },
    },
    {
      $unwind: {
        path: "$tapping_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "cuttings",
        localField: "tapping_id.cutting_id",
        foreignField: "_id",
        pipeline: [
          {
            $unwind: "$item_details", // Unwind to access each item_detail individually
          },
          {
            $lookup: {
              from: "raw_materials",
              localField: "item_details.item_id",
              foreignField: "_id",
              as: "item_details.item_data", // Populate item_data field with data from raw_materials
            },
          },
          {
            $group: {
              _id: "$_id",
              cutting_id: { $push: "$$ROOT" }, // Push back the modified cuttings documents into cutting_id array
            },
          },
        ],
        as: "cutting_id",
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "cutting_id.cutting_id.group_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              group_no: 1,
            },
          },
        ],
        as: "group_data",
      },
    },
    {
      $unwind: {
        path: "$group_data",
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
    result: issuedForGroupingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const SplitReadySheetForm = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authUserDetail = req.userDetails;
    const data = { ...req.body, created_employee_id: authUserDetail._id };
    if (!data.ready_sheet_form_id || !data.split_no_of_pcs) {
      return res.json({
        status: false,
        message: "Missing Required Fields",
      });
    }
    const readySheetForm = await CreateReadySheetFormModel.findById(
      data.ready_sheet_form_id
    ).session(session);
    if (!readySheetForm) {
      return res.json({
        status: false,
        message: "Ready Sheet Form not found",
      });
    }
    if (
      readySheetForm.ready_sheet_form_no_of_pcs_available < data.split_no_of_pcs
    ) {
      if (!readySheetForm) {
        return res.json({
          status: false,
          message: "No Of Pcs exceeds the available quantity",
        });
      }
    }

    const latestGroup = await GroupModel.find().sort({ group_no: -1 }).limit(1);

    const latestGroupNo = latestGroup[0].group_no + 1;
    const calculation =
      (readySheetForm.ready_sheet_form_length *
        readySheetForm.ready_sheet_form_width *
        data.split_no_of_pcs) /
      10000;

    const newReadySheetFormData = {
      group_no: latestGroupNo,
      tapping_id: readySheetForm.tapping_id,
      ready_sheet_form_no_of_pcs_original: data.split_no_of_pcs,
      ready_sheet_form_no_of_pcs_available: data.split_no_of_pcs,
      ready_sheet_form_pallete_no: readySheetForm.ready_sheet_form_pallete_no,
      ready_sheet_form_physical_location:
        readySheetForm.ready_sheet_form_physical_location,
      ready_sheet_form_length: readySheetForm.ready_sheet_form_length,
      ready_sheet_form_width: readySheetForm.ready_sheet_form_width,
      issued_for_tapping_id: readySheetForm.issued_for_tapping_id,
      ready_sheet_form_sqm: parseFloat(calculation.toFixed(2)),
      created_employee_id: authUserDetail._id,
    };

    const newReadySheetFormDataSaved = new CreateReadySheetFormModel(
      newReadySheetFormData
    );
    await newReadySheetFormDataSaved.save({ session });

    readySheetForm.ready_sheet_form_no_of_pcs_available -= data.split_no_of_pcs;
    readySheetForm.ready_sheet_form_sqm -= parseFloat(calculation.toFixed(2));
    readySheetForm.ready_sheet_form_sqm = parseFloat(
      readySheetForm.ready_sheet_form_sqm
    ).toFixed(2);
    if (readySheetForm.remarks == null) {
      readySheetForm.remarks = `Splitted Group No ${latestGroupNo}`;
    } else {
      readySheetForm.remarks += `\n Splitted Group No ${latestGroupNo}`;
    }
    await readySheetForm.save({ session });
    console.log(readySheetForm);
    const FetchedGroupData = await GroupModel.findOne({
      group_no: readySheetForm.group_no,
    });
    console.log(FetchedGroupData, "FetchedGroupData");

    const { _id, group_no, ...groupDataWithoutId } =
      FetchedGroupData.toObject();
    const newGroup = new GroupModel({
      ...groupDataWithoutId,
      created_employee_id: authUserDetail._id,
      split: true,
      group_no: latestGroupNo,
    });

    await newGroup.save({ session });
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ success: true, message: "Split ready sheet form successful" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export const RejectReadySheetForm = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authUserDetail = req.userDetails;
    const data = { ...req.body, created_employee_id: authUserDetail._id };
    if (!data.ready_sheet_form_id || !data.no_of_pcs_to_reject) {
      return res.json({
        status: false,
        message: "Missing Required Fields",
      });
    }
    const readySheetForm = await CreateReadySheetFormModel.findById(
      data.ready_sheet_form_id
    ).session(session);
    if (!readySheetForm) {
      return res.json({
        status: false,
        message: "Ready Sheet Form not found",
      });
    }
    if (
      readySheetForm.ready_sheet_form_no_of_pcs_available <
      data.no_of_pcs_to_reject
    ) {
      return res.json({
        status: false,
        message: "No of Pcs exceeds the available quantity",
      });
    }
    readySheetForm.ready_sheet_form_no_of_pcs_available -=
      data.no_of_pcs_to_reject;
    readySheetForm.ready_sheet_form_rejected_pcs += data.no_of_pcs_to_reject;
    if (readySheetForm.ready_sheet_form_no_of_pcs_available == 0) {
      readySheetForm.status = "not available";
    }
    const calculation =
      (readySheetForm.ready_sheet_form_length *
        readySheetForm.ready_sheet_form_width *
        readySheetForm.ready_sheet_form_no_of_pcs_available) /
      10000;
    readySheetForm.ready_sheet_form_sqm = parseFloat(calculation.toFixed(2));

    await readySheetForm.save({ session: session }); // Await the save() method
    await session.commitTransaction(); // Commit the transaction
    session.endSession();
    res.status(200).json({
      status: "success",
      data: {
        message: "Ready sheet form rejected successfully",
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export const ApproveReadySheetForm = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const authUserDetail = req.userDetails;
    const data = { ...req.body, created_employee_id: authUserDetail._id };

    // Check for missing required fields
    if (!data.ready_sheet_form_id || !data.no_of_pcs_to_approve) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "Missing Required Fields",
      });
    }

    const readySheetForm = await CreateReadySheetFormModel.findById(
      data.ready_sheet_form_id
    ).session(session);

    if (!readySheetForm) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: false,
        message: "Ready Sheet Form not found",
      });
    }

    if (
      readySheetForm.ready_sheet_form_no_of_pcs_available <
      data.no_of_pcs_to_approve
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "No of Pcs exceeds the available quantity",
      });
    }
    readySheetForm.ready_sheet_form_no_of_pcs_available -=
      data.no_of_pcs_to_approve;
    const calculation =
      (readySheetForm.ready_sheet_form_length *
        readySheetForm.ready_sheet_form_width *
        readySheetForm.ready_sheet_form_no_of_pcs_available) /
      10000;
    // Update ready sheet form quantities

    readySheetForm.ready_sheet_form_sqm = parseFloat(calculation.toFixed(2));

    if (readySheetForm.ready_sheet_form_no_of_pcs_available == 0) {
      readySheetForm.status = "not available";
    }
    const updatedReadySheet = await readySheetForm.save();

    // Create history record
    const { _id, ...historyData } = updatedReadySheet.toObject();
    const historyCalculation =
      (historyData.ready_sheet_form_length *
        historyData.ready_sheet_form_width *
        data.no_of_pcs_to_approve) /
      10000;
    const newReadySheetHistory = new ReadySheetFormHistoryModel({
      ...historyData,
      ready_sheet_form_approved_pcs: data.no_of_pcs_to_approve,
      ready_sheet_form_sqm: parseFloat(historyCalculation.toFixed(2)),
      updated_at: Date.now(),
      deleted_at: Date.now(),
    });
    const readySheetHistorySaved = await newReadySheetHistory.save();

    // Issue for pressing
    const IssueForPressing = {
      group_no: historyData.group_no,
      ready_sheet_form_inventory_id: updatedReadySheet._id,
      ready_sheet_form_history_id: readySheetHistorySaved._id,
      created_employee_id: authUserDetail._id,
    };
    const IssuedForPressing = new IssuedForPressingModel(IssueForPressing);
    const issuedForPressingSaved = await IssuedForPressing.save();

    await session.commitTransaction(); // Commit the transaction
    session.endSession();

    res.status(200).json({
      status: "success",
      data: {
        message: "Ready sheet form approved successfully",
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export const FetchReadySheetFormHistory = catchAsync(async (req, res, next) => {
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
    matchQuery["created_at"] = { $gte: new Date(from) };
    matchQuery["created_at"] = { $lte: new Date(to) };
  }

  const totalDocuments = await ReadySheetFormHistoryModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForGroupingData = await ReadySheetFormHistoryModel.aggregate([
    {
      $lookup: {
        from: "tappings",
        localField: "tapping_id",
        foreignField: "_id",
        as: "tapping_id",
      },
    },
    {
      $unwind: {
        path: "$tapping_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "cuttings",
        localField: "tapping_id.cutting_id",
        foreignField: "_id",
        pipeline: [
          {
            $unwind: "$item_details", // Unwind to access each item_detail individually
          },
          {
            $lookup: {
              from: "raw_materials",
              localField: "item_details.item_id",
              foreignField: "_id",
              as: "item_details.item_data", // Populate item_data field with data from raw_materials
            },
          },
          {
            $group: {
              _id: "$_id",
              cutting_id: { $push: "$$ROOT" }, // Push back the modified cuttings documents into cutting_id array
            },
          },
        ],
        as: "cutting_id",
      },
    },
    {
      $lookup: {
        from: "groups",
        localField: "cutting_id.cutting_id.group_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              group_no: 1,
            },
          },
        ],
        as: "group_data",
      },
    },
    {
      $unwind: {
        path: "$group_data",
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
    result: issuedForGroupingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const UpdateReadySheetForm = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const id = req.query.id;
    if (!id) {
      return res.json({
        status: false,
        message: "Missing Id ",
      });
    }
    const updateData = { ...req.body, updated_at: Date.now() };

    const readySheetForm = await CreateReadySheetFormModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, session: session }
    );

    if (!readySheetForm) {
      await session.abortTransaction();
      session.endSession();
      return res.json({
        status: false,
        message: "Ready Sheet Form not found",
      });
    }
    const AllreadySheetForm = await CreateReadySheetFormModel.find();
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      data: {
        message: "Ready sheet form updated successfully",
        updatedData: AllreadySheetForm,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

export const RevertReadySheetForm = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { issuedId } = req.query;

    const pipeline = [
      {
        $match: {
          issued_for_tapping_id: new mongoose.Types.ObjectId(issuedId),
        },
      },
      {
        $group: {
          _id: "$issued_for_tapping_id",
          documents: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          hasError: {
            $anyElementTrue: {
              $map: {
                input: "$documents",
                as: "doc",
                in: {
                  $ne: [
                    "$documents.ready_sheet_form_no_of_pcs_original",
                    "$documents.ready_sheet_form_no_of_pcs_available",
                  ],
                },
              },
            },
          },
        },
      },
      {
        $match: { hasError: true },
      },
    ];

    const result = await CreateReadySheetFormModel.aggregate(pipeline);

    if (result.length > 0) {
      throw new Error("Cannot Revert Ready Sheet Form has been processed");
    }

    await CreateTappingModel.deleteMany(
      { issued_for_tapping_id: issuedId },
      { session: session }
    );

    await CreateReadySheetFormModel.deleteMany(
      { issued_for_tapping_id: issuedId },
      { session: session }
    );

    await IssueForTapingModel.findByIdAndUpdate(
      issuedId,
      { $set: { revert_status: "active" } },
      { session: session }
    );

    // Proceed with further processing if all documents have consistent values

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Ready Sheet Form Reverted",
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
