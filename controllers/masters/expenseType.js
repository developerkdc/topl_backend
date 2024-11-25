import mongoose from "mongoose";
import ExpenseTypeModel from "../../database/schema/masters/expenseType.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";

export const AddExpenseTypeMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const expenseTypeData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newExpenseTypeList = new ExpenseTypeModel(expenseTypeData);
  const savedExpenseType = await newExpenseTypeList.save();
  return res.status(201).json({
    result: savedExpenseType,
    status: true,
    message: "Expense Type created successfully",
  });
});

export const UpdateExpenseTypeMaster = catchAsync(async (req, res) => {
  const userId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: "Invalid ExpenseType ID" });
  }
  const user = await ExpenseTypeModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!user) {
    return res.status(404).json({
      result: [],
      status: false,
      message: "User not found.",
    });
  }
  res.status(200).json({
    result: user,
    status: true,
    message: "Updated successfully",
  });
});

export const ListExpenseTypeMaster = catchAsync(async (req, res) => {
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
          user: [],
        },
        message: "Results Not Found",
      });
    }
    searchQuery = searchdata;
  }
  const totalDocument = await ExpenseTypeModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const expenseTypeList = await ExpenseTypeModel.aggregate([
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

  if (expenseTypeList) {
    return res.status(200).json({
      result: expenseTypeList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: "All Expense Type List",
    });
  }
});

export const DropdownExpenseTypeMaster = catchAsync(async (req, res) => {
  const list = await ExpenseTypeModel.aggregate([
    {
      $match: {
        status: "active",
      },
    },
    {
      $sort: { expense_type_name: 1 },
    },
    {
      $project: {
        expense_type_name: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: "ExpenseType Dropdown List",
  });
});
