import mongoose from 'mongoose';
import PartyModel from '../../database/schema/masters/partyName.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
export const AddPartyNameMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const partyNameData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newPartyList = new PartyModel(partyNameData);
  const savedParty = await newPartyList.save();
  return res.status(201).json({
    result: savedParty,
    status: true,
    message: 'Party created successfully',
  });
});

export const UpdatePartyNameMaster = catchAsync(async (req, res) => {
  const partyId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(partyId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: 'Invalid party ID' });
  }
  const party = await PartyModel.findByIdAndUpdate(
    partyId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!party) {
    return res.status(404).json({
      result: [],
      status: false,
      message: 'Party not found.',
    });
  }
  res.status(200).json({
    result: party,
    status: true,
    message: 'Updated successfully',
  });
});

export const ListPartyNameMaster = catchAsync(async (req, res) => {
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
  const totalDocument = await PartyModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const partyList = await PartyModel.aggregate([
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
  if (partyList) {
    return res.status(200).json({
      result: partyList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: 'All Party List',
    });
  }
});

export const ListPartyNameMasterWithOutPermission = catchAsync(
  async (req, res) => {
    const partyList = await PartyModel.find({ status: 'active' });
    return res.status(201).json({
      result: partyList,
      status: true,
      message: 'All Party  List',
    });
  }
);
