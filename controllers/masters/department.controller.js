import ApiError from "../../utils/errors/apiError.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { StatusCodes } from "../../utils/constants.js";
import departMentModel from "../../database/schema/masters/department.schema.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import mongoose from "mongoose";
import RolesModel from "../../database/schema/roles.schema.js";

export const addDepartment = catchAsync(async (req, res) => {
  const { dept_name, dept_access, remark } = req.body;

  if (!dept_name) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Department name is required"));
  }
  const checkIfAlreadyExists = await departMentModel.find({
    dept_name: dept_name,
  });
  if (checkIfAlreadyExists.length > 0) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Department name already exists"));
  }

  const maxNumber = await departMentModel.aggregate([
    {
      $group: {
        _id: null,
        max: {
          $max: "$sr_no",
        },
      },
    },
  ]);

  const created_employee_id = req.userDetails.id;

  const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
  const newDept = new departMentModel({
    sr_no: newMax,
    dept_name,
    dept_access,
    remark,
    created_employee_id,
  });
  await newDept.save();

  return res.json(new ApiResponse(StatusCodes.OK, "Department created successfully", newDept));
});

export const editDepartment = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { id } = req.params;

  if (!id) {
    await session.abortTransaction();
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Id is missing"));
  }

  const validateDept = await departMentModel.findById(id);
  if (!validateDept) {
    await session.abortTransaction();
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid Category id"));
  }

  const checkIfAlreadyExists = await departMentModel.find({
    _id: { $ne: id },
    dept_name: req?.body?.dept_name,
  });

  if (checkIfAlreadyExists.length > 0) {
    await session.abortTransaction();
    return res.status(404).json(new ApiResponse(StatusCodes.NOT_FOUND, "Department Already Exist."));
  }

  let findRolesForDept = await RolesModel.find({ dept_id: id });
  // console.log(findRolesForDept, "findRolesForDept");

  let deptAccess = req?.body?.dept_access;

  findRolesForDept?.map(async (role) => {
    for (let key in deptAccess) {
      if (deptAccess[key] === true) {
        role.permissions[key] = { ...role.permissions[key], view: true };
      } else {
        role.permissions[key] = { view: false, edit: false, create: false };
      }
    }
    await RolesModel.findByIdAndUpdate(
      role._id,
      {
        $set: {
          permissions: role.permissions,
        },
      },
    );
  });


  const updatedData = await departMentModel.findByIdAndUpdate(
    id,
    { $set: { ...req.body, updated_at: Date.now() } },
    { runValidators: true, new: true, session },
  );
  if (!updatedData) {
    await session.abortTransaction();
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Err updating department"));
  }

  await session.commitTransaction(); // Commit the transaction if successful
  session.endSession(); // End session

  return res.json(new ApiResponse(StatusCodes.OK, "Department updated successfully"));
});

export const listDepartmentDetails = catchAsync(async (req, res) => {
  const { string, boolean, numbers, arrayField = [] } = req?.body?.searchFields || {};
  const { page = 1, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
  const search = req.query.search || "";
  let searchQuery = {};

  if (search != "" && req?.body?.searchFields) {
    const searchdata = DynamicSearch(search, boolean, numbers, string, arrayField);
    console.log(searchdata, "77");
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          user: [],
        },
        message: "Results Not Found",
      });
    }
    searchQuery = searchdata;
  }
  const totalDocument = await departMentModel.countDocuments({
    ...searchQuery,
  });

  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);

  const departmentList = await departMentModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              user_name: 1,
              first_name: 1,
              last_name: 1,
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
    { $match: { ...searchQuery } },
    {
      $sort: { [sortBy]: sort == "desc" ? -1 : 1 },
    },
    { $skip: skip },
    { $limit: limit },
  ]);

  if (departmentList) {
    return res.status(200).json({
      result: departmentList,
      status: true,
      totalPages: totalPages,
      message: "All Department List",
    });
  }
});

export const fetchAllDepartments = catchAsync(async (req, res) => {
  const allDepts = await departMentModel.find().sort({ dept_name: 1 });

  return res.json(new ApiResponse(StatusCodes.OK, "All depts fetched successfully..", allDepts));
});

export const DropdownDepartmentMaster = catchAsync(async (req, res) => {
  const { type } = req.query;

  const searchQuery = type
    ? {
      $or: [{ dept_name: { $regex: type, $options: "i" } }],
    }
    : {};

  const list = await departMentModel.aggregate([
    {
      $match: searchQuery,
    },
    {
      $sort: { dept_name: 1 },
    },
    // {
    //   $project: {
    //     dept_name: 1,
    //   },
    // },
  ]);

  res.status(200).json(new ApiResponse(StatusCodes.OK, "Department dropdown fetched successfully....", list));
});
