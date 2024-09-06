import mongoose from "mongoose";
import SupplierModel from "../../database/schema/masters/supplier.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import ApiError from "../../utils/errors/apiError.js";
import { StatusCodes } from '../../utils/constants.js';
import ApiResponse from '../../utils/ApiResponse.js'
import supplierBranchModel from "../../database/schema/masters/supplier.branches.schema.js";
export const AddSupplierMaster = catchAsync(async (req, res) => {
  const { supplier_name, supplier_type } = req.body;
  const requiredFiedls = ["supplier_name", 'supplier_type'];
  for (let field of requiredFiedls) {
    if (!req.body[field]) {
      return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, `${field} is missing`))
    }
  };

  const newSupplier = new SupplierModel({
    supplier_name, supplier_type
  });
  await newSupplier.save();
  return res.json(new ApiResponse(StatusCodes.OK, "Supplier Created successfully..", newSupplier))
});

export const UpdateSupplierMaster = catchAsync(async (req, res) => {
  const supplierId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid id"))
  }
  const supplier = await SupplierModel.findByIdAndUpdate(
    supplierId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!supplier) {
    return res.status(StatusCodes.NOT_FOUND).json(new ApiResponse(StatusCodes.NOT_FOUND, "Supplier not found with given Id"));
  }
  res.status(200).json({
    statusCode: StatusCodes.OK,
    result: supplier,
    status: true,
    message: "Updated successfully",
  });
});

export const ListSupplierMaster = catchAsync(async (req, res) => {
  const { string, boolean, numbers, arrayField = [] } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;
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


export const addBranchToSupplier = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { contact_person, address, state, country, city, pincode, gst_number, web_url, is_main_branch, branch_name } = req.body;
  console.log("req body => ", req.body)

  const requiredFields = ['contact_person', 'address', 'state', 'country', 'city', 'pincode', 'gst_number', 'web_url', 'branch_name'];
  for (let field of requiredFields) {
    if (!req.body[field]) {
      return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, `${field} is missing`))
    };
  };

  // const newId = new mongoose.Types.ObjectId(id);

  const validateSupplierId = await SupplierModel.findById(id);
  if (!validateSupplierId) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid supplier_id"))
  }
  const newSupplierBranch = new supplierBranchModel({
    supplier_id: id, contact_person, address, state, country, city, pincode, gst_number, web_url, is_main_branch, branch_name
  });
  await newSupplierBranch.save();

  return res.json(new ApiResponse(StatusCodes.OK, "New branch created successfully...", newSupplierBranch))
})


export const fetchAllSupplierWithBranchesDetails = catchAsync(async (req, res) => {

  const { query, sortField, sortOrder, page, limit } = req.query;
  console.log(`query => ${query} , sortField => ${sortField} , sortOrder => ${sortOrder}`)
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === "desc" ? -1 : 1;
  const sortObj = sortField ? { [sortField]: sortDirection } : {}
  console.log("sort obj => ", sortObj)
  const searchQuery = query
    ? {
      $or: [
        { "contact_person.name": { $regex: query, $options: "i" } },
        { "supplierDetails.supplier_name": { $regex: query, $options: "i" } },
        { "supplierDetails.supplier_type": { $regex: query, $options: "i" } },
      ],
    }
    : {};


  const pipeline = [
    {
      $lookup: {
        from: "suppliers",
        localField: "supplier_id",
        foreignField: "_id",
        as: "supplierDetails"
      }
    },
    { $match: searchQuery },
    { $unwind: '$supplierDetails' },
    { $skip: skipped },
    { $limit: limitInt }
    // { $sort: sortObj }
  ];

  if (Object.keys(sortObj).length > 0) {
    pipeline.push({ $sort: sortObj });
  }
  const allDetails = await supplierBranchModel.aggregate(pipeline);


  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, "NO Data found..."));
  }
  const totalPage = allDetails.length;
  return res.json(new ApiResponse(StatusCodes.OK, "All Details fetched succesfully..", { allDetails, totalPage }))
});


export const updateSupplierBranchById = catchAsync(async (req, res) => {
  const { id } = req.query;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid id"))
  }
  const supplier = await supplierBranchModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!supplier) {
    return res.status(StatusCodes.NOT_FOUND).json(new ApiResponse(StatusCodes.NOT_FOUND, "Supplier Branch not found with given Id"));
  }
  return res.status(200).json(new ApiResponse(StatusCodes.OK, "Branch updated successfully...", supplier));
})


export const updateContactPersonInfo = catchAsync(async (req, res) => {
  const { id } = req.query;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid id"))
  }
  const supplier = await supplierBranchModel.findOneAndUpdate(
    { "contact_person._id": id },
    { $set: { "contact_person.$": updateData } },
    { new: true, runValidators: true }
  );
  if (!supplier) {
    return res.status(StatusCodes.NOT_FOUND).json(new ApiResponse(StatusCodes.NOT_FOUND, "Supplier Branch not found with given Id"));
  }
  return res.status(200).json(new ApiResponse(StatusCodes.OK, "Branch updated successfully...", supplier));
})

export const fetchAllBranchesBySupplierId = catchAsync(async (req, res) => {

  const { id } = req.params;
  const { query, sortField, sortOrder, page, limit } = req.query;

  if (!id) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Id is missing"))
  };
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === "desc" ? -1 : 1;
  const sortObj = sortField ? { [sortField]: sortDirection } : {}
  const searchQuery = query
    ? {
      $or: [
        { "contact_person.name": { $regex: query, $options: "i" } },
        { "supplierDetails.supplier_name": { $regex: query, $options: "i" } },
        { "supplierDetails.supplier_type": { $regex: query, $options: "i" } },
      ],
    }
    : {};

  const validateId = await SupplierModel.findById(id);
  if (!validateId) {
    return res.json(new ApiResponse(StatusCodes.NOT_FOUND, "Invalid Id"))
  };

  const pipeline = [
    { $match: { ...searchQuery, supplier_id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "suppliers",
        localField: "supplier_id",
        foreignField: "_id",
        as: "supplierDetails"
      }
    },
    { $unwind: '$supplierDetails' },
    { $skip: skipped },
    { $limit: limitInt },
    // { $sort: sortObj },
    // {
    //   $project: {
    //     "supplierDetails._id": 1,
    //     "supplierDetails.supplier_name": 1,
    //     "supplierDetails.supplier_type": 1,
    //     contact_person: 1,
    //     branch_name: 1
    //   }
    // }

  ];


  if (Object.keys(sortObj).length > 0) {
    pipeline.push({ $sort: sortObj });
  }
  const allDetails = await supplierBranchModel.aggregate(pipeline);

  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, "NO Data found..."));
  }
  const totalPage = allDetails.length;
  return res.json(new ApiResponse(StatusCodes.OK, "All Details fetched succesfully..", { allDetails, totalPage }))
});


export const fetchContactPersonById = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "id is misssing"))
  };
  const contactPersonData = await supplierBranchModel.findOne({ "contact_person._id": id });

  if (!contactPersonData) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "No user found with given id"))
  }
  const contactPerson = contactPersonData.contact_person.find(person => person._id.toString() === id)
  return res.json(new ApiResponse(StatusCodes.OK, "Contact Person fetched successfully", contactPerson))
});

export const addContactPersonToBranch = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile_number, designation } = req.body;
  if (!id) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "branch id is missing"));
  };

  const checkExistsingBranch = await supplierBranchModel.findById(id);
  if (!checkExistsingBranch) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Branch not found with given id"))
  };

  const updatedData = await supplierBranchModel.updateOne({ _id: id }, { $push: { contact_person: req.body } }, { upsert: true });
  if (updatedData.modifiedCount === 0 && !updatedData.upsertedCount === 0) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Err adding data... "))
  }
  return res.json(
    new ApiResponse(StatusCodes.OK, "Contact Person Added Successfully")
  );

});

export const fetchAllSupplierWithBranchesDetailsBySupplierId = catchAsync(async (req, res) => {

  const { query, sortField, sortOrder, page, limit } = req.query;
  const { id } = req.params;
  if (!id) {
    return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Id is missing"))
  }
  console.log(`query => ${query} , sortField => ${sortField} , sortOrder => ${sortOrder}`)
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === "desc" ? -1 : 1;
  const sortObj = sortField ? { [sortField]: sortDirection } : {}
  console.log("sort obj => ", sortObj)
  const searchQuery = query
    ? {
      $or: [
        { "contact_person.name": { $regex: query, $options: "i" } },
        { "supplierDetails.supplier_name": { $regex: query, $options: "i" } },
        { "supplierDetails.supplier_type": { $regex: query, $options: "i" } },
      ],
    }
    : {};


  const pipeline = [
    { $match: { 'supplier_id': id } },
    {
      $lookup: {
        from: "suppliers",
        localField: "supplier_id",
        foreignField: "_id",
        as: "supplierDetails"
      }
    },
    { $match: searchQuery },
    { $unwind: '$supplierDetails' },
    { $skip: skipped },
    { $limit: limitInt }
    // { $sort: sortObj }
  ];

  if (Object.keys(sortObj).length > 0) {
    pipeline.push({ $sort: sortObj });
  }
  const allDetails = await supplierBranchModel.aggregate(pipeline);


  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, "NO Data found..."));
  }
  const totalPage = allDetails.length;
  return res.json(new ApiResponse(StatusCodes.OK, "All Details fetched succesfully..", { allDetails, totalPage }))
});
