import mongoose from 'mongoose';
import PalleteModel from '../../database/schema/masters/pallete.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import XLSX from 'xlsx';
export const AddPalleteMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const palleteData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newPalleteList = new PalleteModel(palleteData);
  const savedPallete = await newPalleteList.save();
  return res.status(201).json({
    result: savedPallete,
    status: true,
    message: 'Pallete created successfully',
  });
});

export const UpdatePalleteMaster = catchAsync(async (req, res) => {
  const palleteId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(palleteId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: 'Invalid pallete ID' });
  }
  const pallete = await PalleteModel.findByIdAndUpdate(
    palleteId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!pallete) {
    return res.status(404).json({
      result: [],
      status: false,
      message: 'Pallete not found.',
    });
  }
  res.status(200).json({
    result: pallete,
    status: true,
    message: 'Updated successfully',
  });
});

export const ListPalleteMaster = catchAsync(async (req, res) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const search = req.query.search || '';
  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
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
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }
  const totalDocument = await PalleteModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const palleteList = await PalleteModel.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: 'created_employee_id',
      },
    },
    {
      $unwind: {
        path: '$created_employee_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: { ...searchQuery },
    },
    {
      $sort: { [sortBy]: sort == 'desc' ? -1 : 1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);
  if (palleteList) {
    return res.status(200).json({
      result: palleteList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: 'All Pallete List',
    });
  }
});

export const DropdownPalleteMaster = catchAsync(async (req, res) => {
  const list = await PalleteModel.aggregate([
    {
      $match: {
        status: 'active',
      },
    },
    {
      $project: {
        pallete_no: 1,
        item_physical_location: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: 'Pallete Dropdown List',
  });
});

export const BulkUploadPalleteMaster = catchAsync(async (req, res, next) => {
  const file = req.file;
  const workbook = XLSX.readFile(file.path);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  console.log(data, 'data');

  const session = await PalleteModel.startSession();
  session.startTransaction();

  try {
    if (data.length === 0) {
      return res.status(400).json({
        result: [],
        status: false,
        message: 'No items found in the uploaded file.',
      });
    }

    const authUserDetail = req.userDetails;

    for (const item of data) {
      const requiredFields = ['pallete_no', 'item_physical_location'];

      for (const field of requiredFields) {
        if (!item[field]) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            result: [],
            status: false,
            message: `${field} is required for all items.`,
          });
        }
      }

      const itemMasterData = {
        pallete_no: item.pallete_no,
        item_physical_location: item.item_physical_location,
        pallete_remarks: item.pallete_remarks,
        created_employee_id: authUserDetail._id,
        status: 'active',
      };
      console.log(itemMasterData, 'itemMasterData');

      const newItemMaster = new PalleteModel(itemMasterData);
      const savedItemMaster = await newItemMaster.save({ session });
      console.log(savedItemMaster, 'savedItemMaster');
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      result: [],
      status: true,
      message: 'Item Master bulk uploaded successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});
