import seriesModel from "../../database/schema/masters/series.schema.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { StatusCodes } from "../../utils/constants.js";
import catchAsync from "../../utils/errors/catchAsync.js";

export const addSeries = catchAsync(async (req, res) => {
  const { series_name } = req.body;

  if (!series_name) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "series name is required"
      )
    );
  }
  const checkIfAlreadyExists = await seriesModel.find({
    series_name: series_name,
  });
  if (checkIfAlreadyExists.length > 0) {
    return res.json(new ApiResponse(StatusCodes.OK, "series already exists"));
  }

  const maxNumber = await seriesModel.aggregate([
    {
      $group: {
        _id: null,
        max: {
          $max: "$sr_no",
        },
      },
    },
  ]);

  const created_by = req.userDetails.id;

  const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;

  const newSeries = new seriesModel({
    sr_no: newMax,
    series_name,
    created_by,
  });
  await newSeries.save();

  return res.json(
    new ApiResponse(StatusCodes.OK, "Series created successfully", newSeries)
  );
});

export const editSeries = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Id is missing")
    );
  }

  const validateDept = await seriesModel.findById(id);
  if (!validateDept) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid series id")
    );
  }

  const updatedData = await seriesModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { runValidators: true, new: true }
  );
  if (!updatedData) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Err updating series")
    );
  }
  return res.json(
    new ApiResponse(StatusCodes.OK, "Series updated successfully")
  );
});

export const listSeriesDetails = catchAsync(async (req, res) => {
  const { query, sortField, sortOrder, page, limit } = req.query;
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === "desc" ? -1 : 1;
  const sortObj = sortField ? { [sortField]: sortDirection } : {};
  const searchQuery = query
    ? {
        $or: [{ series_name: { $regex: query, $options: "i" } }],
      }
    : {};

  const pipeline = [
    {
      $lookup: {
        from: "users",
        localField: "created_by",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $match: searchQuery },
    { $unwind: "$userDetails" },
    {
      $project: {
        sr_no: 1,
        series_name: 1,
        createdAt: 1,
        created_by: 1,
        "userDetails.first_name": 1,
        "userDetails.last_name": 1,
      },
    },
    { $skip: skipped },
    { $limit: limitInt },
  ];

  if (Object.keys(sortObj).length > 0) {
    pipeline.push({ $sort: sortObj });
  }
  const allDetails = await seriesModel.aggregate(pipeline);
  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, "NO Data found..."));
  }

  const totalDocs = await seriesModel.countDocuments({ ...searchQuery });
  const totalPage = Math.ceil(totalDocs / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, "All Details fetched succesfully..", {
      allDetails,
      totalPage,
    })
  );
});

export const DropdownSeriesNameMaster = catchAsync(async (req, res) => {
  const { type } = req.query;

  const searchQuery = type
    ? {
        $or: [{ "series_name": { $regex: type, $options: "i" } }],
      }
    : {};

  const list = await seriesModel.aggregate([
    {
      $match: searchQuery,
    },
    {
      $project: {
        series_name: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Series Name dropdown fetched successfully....",
        list
      )
    );
});
