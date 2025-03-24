import ApiError from '../../utils/errors/apiError.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { StatusCodes } from '../../utils/constants.js';
import itemCategoryModel from '../../database/schema/masters/item.category.schema.js';
export const addItems = catchAsync(async (req, res) => {
  const { category, product_hsn_code, calculate_unit } = req.body;

  if (!category || !product_hsn_code || !calculate_unit) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'All fields are required'
      )
    );
  }
  const checkIfAlreadyExists = await itemCategoryModel.find({
    category: category,
  });
  if (checkIfAlreadyExists.length > 0) {
    return res.json(
      new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Category already exists'
      )
    );
  }

  const maxNumber = await itemCategoryModel.aggregate([
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
  const newItemCatgory = new itemCategoryModel({
    sr_no: newMax,
    category,
    product_hsn_code,
    calculate_unit,
    created_by,
  });
  await newItemCatgory.save();

  return res.json(
    new ApiResponse(
      StatusCodes.OK,
      'Item category created successfully',
      newItemCatgory
    )
  );
});

export const editItemCatgory = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.json(
      new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Id is missing')
    );
  }

  const validateCategory = await itemCategoryModel.findById(id);
  if (!validateCategory) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid Category ')
      );
  }

  const updatedData = await itemCategoryModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { runValidators: true, new: true }
  );
  if (!updatedData) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        new ApiResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Err updating category'
        )
      );
  }
  return res.json(
    new ApiResponse(StatusCodes.OK, 'category updated successfully')
  );
});

export const listItemCategories = catchAsync(async (req, res) => {
  const {
    query,
    sortField = 'UpdatedAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = req.query;
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const skipped = (pageInt - 1) * limitInt;

  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  const sortObj = sortField
    ? { [sortField]: sortDirection }
    : { updatedAt: -1 };
  // const searchQuery = query
  //   ? {
  //       $or: [
  //         { "category": { $regex: query, $options: "i" } },
  //         { "calculate_unit": { $regex: query, $options: "i" } },
  //         { "product_hsn_code": { $regex: query, $options: "i" } },
  //         { "userDetails.first_name": { $regex: query, $options: "i" } },
  //         { "userDetails.last_name": { $regex: query, $options: "i" } },
  //         // { "createdAt": { $regex: query, $options: "i" } },
  //       ],
  //     }
  //   : {};
  const searchQuery = query
    ? {
        $or: [
          { category: { $regex: query, $options: 'i' } },
          { calculate_unit: { $regex: query, $options: 'i' } },
          { product_hsn_code: { $regex: query, $options: 'i' } },
          { 'userDetails.user_name': { $regex: query, $options: 'i' } },

          ...(isValidDate(query)
            ? [
                {
                  createdAt: {
                    $gte: new Date(new Date(query).setHours(0, 0, 0, 0)), // Start of the day
                    $lt: new Date(new Date(query).setHours(23, 59, 59, 999)), // End of the day
                  },
                },
              ]
            : []),
        ],
      }
    : {};

  function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    { $unwind: '$userDetails' },
    { $match: searchQuery },
    {
      $project: {
        sr_no: 1,
        category: 1,
        calculate_unit: 1,
        product_hsn_code: 1,
        createdAt: 1,
        created_by: 1,
        'userDetails.first_name': 1,
        'userDetails.user_name': 1,
      },
    },
    { $sort: sortObj },
    { $skip: skipped },
    { $limit: limitInt },
  ];

  // if (Object.keys(sortObj).length > 0) {
  //   pipeline.push({ $sort: sortObj });
  // }
  const allDetails = await itemCategoryModel.aggregate(pipeline);

  if (allDetails.length === 0) {
    return res.json(new ApiResponse(StatusCodes.OK, 'NO Data found...'));
  }
  // const totalPage = allDetails.length;
  const totalDocs = await itemCategoryModel.countDocuments({ ...searchQuery });
  const totalPage = Math.ceil(totalDocs / limitInt);
  return res.json(
    new ApiResponse(StatusCodes.OK, 'All Details fetched succesfully..', {
      allDetails,
      totalPage,
    })
  );
});

export const fetchAllCategories = catchAsync(async (req, res) => {
  const allData = await itemCategoryModel.find().sort({ category: 1 });

  return res.json(
    new ApiResponse(
      StatusCodes.OK,
      'All categories fetched successfully..',
      allData
    )
  );
});

export const DropdownItemCategoryNameMaster = catchAsync(async (req, res) => {
  const { type } = req.query;

  const searchQuery = type
    ? {
        $or: [{ category: { $regex: type, $options: 'i' } }],
      }
    : {};

  const list = await itemCategoryModel.aggregate([
    {
      $match: searchQuery,
    },
    {
      $sort: { category: 1 },
    },
    {
      $project: {
        category: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        'Category Name dropdown fetched successfully....',
        list
      )
    );
});
