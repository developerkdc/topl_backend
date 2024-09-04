import mongoose from "mongoose";
import SupplierModel from "../../database/schema/masters/supplier.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
export const AddSupplierMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const supplierData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newSupplierList = new SupplierModel(supplierData);
  const savedSupplier = await newSupplierList.save();
  return res.status(201).json({
    result: savedSupplier,
    status: true,
    message: "Supplier created successfully",
  });
});

export const UpdateSupplierMaster = catchAsync(async (req, res) => {
  const supplierId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: "Invalid supplier ID" });
  }
  const supplier = await SupplierModel.findByIdAndUpdate(
    supplierId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!supplier) {
    return res.status(404).json({
      result: [],
      status: false,
      message: "Supplier not found.",
    });
  }
  res.status(200).json({
    result: supplier,
    status: true,
    message: "Updated successfully",
  });
});

export const ListSupplierMaster = catchAsync(async (req, res) => {
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
  const totalDocument = await SupplierModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const supplierList = await SupplierModel.aggregate([
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
  ]);
  if (supplierList) {
    return res.status(200).json({
      result: supplierList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: "All Supplier List",
    });
  }
});

export const ListSupplierMasterWithOutPermission = catchAsync(
  async (req, res) => {
    
    const supplierList = await SupplierModel.find({ status: "active" });
    return res.status(201).json({
      result: supplierList,
      status: true,
      message: "All Supplier List",
    });
  }
);
