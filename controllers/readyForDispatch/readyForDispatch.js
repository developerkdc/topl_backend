import { FinishingModel } from "../../database/schema/finishing/finishing.schema.js";
import { IssuedForFinishingModel } from "../../database/schema/finishing/issuedForFinishing.schema.js";
import { QcDoneInventoryModel } from "../../database/schema/qcDone.js/qcDone.schema.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import mongoose from "mongoose";
export const ListReadyForDispatch = catchAsync(async (req, res, next) => {
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

  const totalDocuments = await QcDoneInventoryModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingView = mongoose.connection.db.collection(
    "qc_done_inventories_view"
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

export const RevertReadyForDispatch = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { id } = req.query;

    console.log(req.body, "bodyyy");
    const QcDoneView = mongoose.connection.db.collection(
      "qc_done_inventories_view"
    );
    const QcDoneDetails = await QcDoneView.findOne({
      _id: new mongoose.Types.ObjectId(id),
    });
    if (
      QcDoneDetails.qc_no_of_pcs_available !=
      QcDoneDetails.finishing_details.finishing_no_of_pcs
    ) {
      throw new Error("Edit cannot be done");
    }

    const issuedForFinishingDetails = await IssuedForFinishingModel.findById(
      QcDoneDetails.issued_for_finishing_id
    );
    issuedForFinishingDetails.available_pressed_pcs +=
      QcDoneDetails.qc_no_of_pcs_available;
    issuedForFinishingDetails.revert_status = "active";
    issuedForFinishingDetails.save();

    const FinishingDetails = await FinishingModel.findByIdAndDelete(
      QcDoneDetails.finishing_details._id
    );
    const QcDoneInventoryDetails = await QcDoneInventoryModel.findByIdAndDelete(
      QcDoneDetails._id
    );
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

export const UpdateReadyForDispatch = catchAsync(async (req, res, next) => {
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
    const updateData = { ...req.body };

    const readySheetForm = await QcDoneInventoryModel.findByIdAndUpdate(
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
    const AllreadySheetForm = await QcDoneInventoryModel.find();
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
