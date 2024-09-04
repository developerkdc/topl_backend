import mongoose from "mongoose";
import RolesModel from "../database/schema/roles.schema.js";
import UserModel from "../database/schema/user.schema.js";
import { create, generateRandomPassword } from "../utils/authServices/index.js";
import { SendOtpEmail } from "../utils/emailServices/otp.js";
import catchAsync from "../utils/errors/catchAsync.js";
import { IdRequired, SomethingWrong } from "../utils/response/response.js";

import { DynamicSearch } from "../utils/dynamicSearch/dynamic.js";

export const AddUser = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const password = generateRandomPassword(8);
  const hashedPassword = await create(password);
  const userData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
    password: hashedPassword,
  };

  const isRoleActive = await RolesModel.findById(userData?.role_id);

  if (isRoleActive.status == false) {
    return res.status(400).json({
      result: [],
      status: true,
      message: "Role is Inactive",
    });
  }

  const newUser = new UserModel(userData);
  const savedUser = await newUser.save();
  SendOtpEmail(
    req.body.email_id,
    `Your new password is: ${password}`,
    "Your New Account Password"
  );
  return res.status(201).json({
    result: savedUser,
    status: true,
    message: "User created successfully",
  });
});

export const UpdateUser = catchAsync(async (req, res) => {
  const userId = req.query.id;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      result: [],
      status: false,
      message: userId ? "Invalid user ID" : IdRequired,
    });
  }
  const requiredFields = [
    "employee_id",
    "first_name",
    "last_name",
    "email_id",
    "role_name",
  ];

  for (const field of requiredFields) {
    if (req.body[field] === "") {
      return res.status(400).json({
        result: [],
        status: false,
        message: `${field} should not be empty.`,
      });
    }
  }
  const updateData = { ...req.body};
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found.",
    });
  }

  res.status(200).json({
    result: user,
    status: true,
    message: "User updated successfully",
  });
});

export const ListUser = catchAsync(async (req, res) => {
  const { string, boolean, numbers ,arrayField=[]} = req?.body?.searchFields || {};
 const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;
  const search = req.query.search || "";
  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
    const searchdata = DynamicSearch(search, boolean, numbers, string,arrayField);
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
  const totalDocument = await UserModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);

  const user = await UserModel.aggregate([
    {
      $lookup: {
        from: "roles",
        localField: "role_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              role_name: 1,
            },
          },
        ],
        as: "role_id",
      },
    },
    {
      $unwind: {
        path: "$role_id",
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
    {
      $project: {
        password: 0,
        otp: 0,
        otp_expiry_date: 0,
        verify_otp: 0,
      },
    },
  ]);
  if (user) {
    return res.status(200).json({
      result: user,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: "All Users List",
    });
  }
});

export const DeleteUser = catchAsync(async (req, res) => {
  const { id } = req.query;
  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    return res.status(401).json({
      result: [],
      status: false,
      message: "User Id does not exist.",
    });
  }

  return res.status(200).json({
    result: [],
    status: true,
    message: "User deleted successfully.",
  });
});

export const AdminChangePassword = catchAsync(async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        result: [],
        status: false,
        message: IdRequired,
      });
    }
    if (!req.body.new_password) {
      return res.status(400).json({
        result: [],
        status: false,
        message: "New password is required.",
      });
    }

    const hashedNewPassword = await create(req.body.new_password);
    const userUpdate = await UserModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          password: hashedNewPassword,
        },
      },
      { new: true, useFindAndModify: false }
    );
    console.log(userUpdate, "user");
    if (!userUpdate) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }
    const authUserDetail = req.userDetails;
    SendOtpEmail(
      authUserDetail.email_id,
      `Your new password is: ${req.body.new_password}`,
      "Your New Account Password"
    );
    return res.status(200).json({
      result: [],
      status: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Error updating user password:", error);
    return res
      .status(500)
      .json({ result: [], status: false, message: SomethingWrong });
  }
});

export const RoleNameList = catchAsync(async (req, res) => {
  const role = await RolesModel.find({}, "_id role_name");
  if (!role) {
    return res.status(401).json({
      result: [],
      status: false,
      message: "Role not found.",
    });
  }
  return res.status(200).json({
    result: role,
    status: true,
    message: "List all role name.",
  });
});

export const EmployeeIdAutoGenerate = catchAsync(async (req, res) => {
  const user = await UserModel.distinct("employee_id");

  if (!user || user.length === 0) {
    return res.status(200).json({
      result: 1,
      status: true,
      message: "Latest employee Id.",
    });
  }
  const latestEmployeeId = Math.max(...user) + 1;
  return res.status(200).json({
    result: latestEmployeeId,
    status: true,
    message: "Latest employee Id.",
  });
});
