import mongoose from "mongoose";
import catchAsync from "../utils/errors/catchAsync.js";
import { IdRequired } from "../utils/response/response.js";
import RolesModel from "../database/schema/roles.schema.js";
import { DynamicSearch } from "../utils/dynamicSearch/dynamic.js";

export const AddRole = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const roleData = {
    ...req.body,
    // created_employee_id: authUserDetail._id,
    created_employee_id: '66d6b301414c6838b6a7dba5',
  };
  const newRole = new RolesModel(roleData);
  const savedRole = await newRole.save();

  return res.status(201).json({
    result: savedRole,
    status: true,
    message: "Role created successfully",
  });
});

export const UpdateRole = catchAsync(async (req, res) => {
  const roleId = req.query.id;
  const updateData = req.body;
  updateData.updated_at = Date.now();

  if (!roleId) {
    return res.status(400).json({
      result: [],
      status: false,
      message: IdRequired,
    });
  }
  if (!updateData.role_name) {
    return res.status(400).json({
      result: [],
      status: false,
      message: "Role name is required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(roleId)) {
    return res.status(400).json({
      result: [],
      status: false,
      message: "Invalid role ID",
    });
  }
  const rolesById = await RolesModel.findOne({
    _id: roleId,
  });

  if (!rolesById) {
    return res.status(400).json({
      result: [],
      status: false,
      message: "Role Not exists with this ID.",
    });
  }
  updateData.updated_at = Date.now();
  console.log(updateData, "6222");
  const roles = await RolesModel.findByIdAndUpdate(roleId, { $set: updateData }, { new: true, runValidators: true });
  if (!roles) {
    return res.status(404).json({
      result: [],
      status: false,
      message: "Role not found.",
    });
  }
  res.status(200).json({
    result: roles,
    status: true,
    message: "Updated successfully.",
  });
});

export const ListRoles = catchAsync(async (req, res) => {
  const { string, boolean, numbers, arrayField = [] } = req?.body?.searchFields || {};
  const { page = 1, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
  const search = req.query.search || "";
  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
    const searchdata = DynamicSearch(search, boolean, numbers, string, arrayField);
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
  console.log(searchQuery, "10666");
  const totalDocument = await RolesModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const rolesList = await RolesModel.aggregate([
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
      $match: { ...searchQuery },
    },
    {
      $sort: { [sortBy]: sort == "desc" ? -1 : 1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]).collation({ locale: "en", caseLevel: true });
  if (rolesList) {
    return res.status(200).json({
      result: rolesList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: "All Roles List",
    });
  }
});

export const DropdownRoleMaster = catchAsync(async (req, res) => {
  const list = await RolesModel.aggregate([
    {
      $match: {
        status: true,
      },
    },
    {
      $project: {
        role_name: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: "Roles Dropdown List",
  });
});
