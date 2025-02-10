import ApiError from '../../utils/errors/apiError.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import itemCategoryModel from '../../database/schema/masters/item.category.schema.js';
import itemSubCategoryModel from '../../database/schema/masters/item.subcategory.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
export const addItems = catchAsync(async (req, res) => {
  const { name, remark, category } = req.body;

  if (!name) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Subcategory name is missing'
      )
    );
  }


  const checkIfAlreadyExists = await itemSubCategoryModel.find({ name: name });
  if (checkIfAlreadyExists.length > 0) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Subcategory already exists'
      )
    );
  }

  const maxNumber = await itemSubCategoryModel.aggregate([
    {
      $group: {
        _id: null,
        max: {
          $max: '$sr_no',
        },
      },
    },
  ]);

  const created_by = req.userDetails.id;

  const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
  // const newMax = 1
  const newItemCatgory = new itemSubCategoryModel({
    sr_no: newMax,
    name,
    category,
    remark,
    created_by,
  });
  await newItemCatgory.save();

  return res.json(
    new ApiResponse(
      StatusCodes.OK,
      'Item subcategory created successfully',
      newItemCatgory
    )
  );
});

export const editItemSubCategory = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Id is missing')
    );
  }

  const validateSubCategory = await itemSubCategoryModel.findById(id);
  if (!validateSubCategory) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Invalid SubCategory id'
      )
    );
  }

  const updatedData = await itemSubCategoryModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { runValidators: true, new: true }
  );
  if (!updatedData) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Err updating subcategory'
      )
    );
  }
  return res.json(
    new ApiResponse(
      StatusCodes.OK,
      'subcategory updated successfully',
      updatedData
    )
  );
});

export const listItemSubCategories = catchAsync(async (req, res) => {
  const { query, sortField, sortOrder, page, limit } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  const sortObj = sortField ? { [sortField]: sortDirection } : {};
  // const searchQuery = query
  //   ? {
  //       $or: [{ name: { $regex: query, $options: "i" } }],
  //     }
  //   : {};
  let searchQuery = {};
  if (query != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      query,
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
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  // const { to, from, ...data } = req?.body?.filters || {};
  // const matchQuery = data || {};

  // if (to && from) {
  //   matchQuery["createdAt "] = {
  //     $gte: new Date(from), // Greater than or equal to "from" date
  //     $lte: new Date(to), // Less than or equal to "to" date
  //   };
  // }

  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $lookup: {
        from: 'item_subcategories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
    { $match: { ...searchQuery } },
    {
      $project: {
        sr_no: 1,
        name: 1,
        remark: 1,
        'categoryDetails': 1,
        createdAt: 1,
        created_by: 1,
        'userDetails.first_name': 1,
        'userDetails.user_name': 1,
      },
    },
    { $skip: skipped },
    { $limit: limitInt },
  ];

  if (Object.keys(sortObj).length > 0) {
    pipeline.push({ $sort: sortObj });
  }
  const allDetails = await itemSubCategoryModel.aggregate(pipeline);

  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, 'NO Data found...'));
  }
  // const totalPage = allDetails.length;
  const totalDocs = await itemSubCategoryModel.countDocuments({
    ...searchQuery,
  });
  const totalPage = Math.ceil(totalDocs / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, 'All Details fetched successfully..', {
      allDetails,
      totalPage,
    })
  );
});

export const DropdownSubcategoryNameMaster = catchAsync(async (req, res) => {
  const { type } = req.query;

  // const searchQuery = type
  //   ? {
  //     $or: [{ name: { $regex: type, $options: 'i' } }, { 'categoryDetails.category': { $regex: type, $options: "i" } }],
  //   }
  //   : {};
  let searchQuery = {};

  if (type) {
    searchQuery['categoryDetails.category'] = type
  };


  console.log(searchQuery)

  const list = await itemSubCategoryModel.aggregate([
    {
      $lookup: {
        from: "item_categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails"
      }
    },
    // {
    //   $unwind: {
    //     path: "$categoryDetails",
    //     preserveNullAndEmptyArrays: true
    //   }
    // },
    {
      $match: searchQuery,
    },
    {
      $sort: { name: 1 },
    },
    {
      $project: {
        name: 1,
        'categoryDetails.category': 1,
        'catgeoryDetails._id': 1
      },
    },
  ]).collation({ locale: 'en', caseLevel: true });

  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Subcategory dropdown fetched successfully....',
        list
      )
    );
});
