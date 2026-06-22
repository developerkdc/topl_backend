import mongoose from 'mongoose';
import UnitModel from '../../database/schema/masters/unit.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import { UnitJSONtoXML } from '../../utils/tally-utils/TallyLedgerCreation.js';
import { XMLParser } from 'fast-xml-parser';
import { sendToTally } from '../../utils/tally-utils/TallyService.js';
import { StatusCodes } from '../../utils/constants.js';
import ApiResponse from '../../utils/ApiResponse.js';


export const AddUnitMaster = catchAsync(async (req, res) => {
  const authUserDetail = req.userDetails;
  const unitData = {
    ...req.body,
    created_employee_id: authUserDetail._id,
  };
  const newUnitList = new UnitModel(unitData);
  const savedUnit = await newUnitList.save();

  let tallyResponse = null;

  try {
    tallyResponse = await create_unit_helper(savedUnit._id);
  } catch (err) {
    console.error("Tally sync failed manually update item to sync it to tally:", savedUnit._id, err.message);
    tallyResponse = err.message;
  }

  return res.json(
    new ApiResponse(
      StatusCodes.OK,
      'Unit created successfully',
      {
        savedUnit,
        tallyResponse
      }
    )
  );
});

export const UpdateUnitMaster = catchAsync(async (req, res) => {
  const unitId = req.query.id;
  const updateData = req.body;
  if (!mongoose.Types.ObjectId.isValid(unitId)) {
    return res
      .status(400)
      .json({ result: [], status: false, message: 'Invalid unit ID' });
  }
  const unit = await UnitModel.findByIdAndUpdate(
    unitId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  if (!unit) {
    return res.status(404).json({
      result: [],
      status: false,
      message: 'Unit not found.',
    });
  }

  let tallyResponse = null;

  try {
    tallyResponse = await create_unit_helper(unit._id);
  } catch (err) {
    console.error("Tally sync failed manually update unit to sync it to tally:", unit._id, err.message);
    tallyResponse = err.message;
  }

  return res.json(
    new ApiResponse(StatusCodes.OK, 'unit updated successfully', {
      tallyResponse
    })
  );
});

export const ListUnitMaster = catchAsync(async (req, res) => {
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
  const totalDocument = await UnitModel.countDocuments({
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocument / limit);
  const validPage = Math.min(Math.max(page, 1), totalPages);
  const skip = Math.max((validPage - 1) * limit, 0);
  const unitList = await UnitModel.aggregate([
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
  ]).collation({ locale: 'en', caseLevel: true });
  if (unitList) {
    return res.status(200).json({
      result: unitList,
      status: true,
      totalPages: totalPages,
      currentPage: validPage,
      message: 'All UnitList List',
    });
  }
});

export const DropdownUnitMaster = catchAsync(async (req, res) => {
  const list = await UnitModel.aggregate([
    {
      $match: {
        status: 'active',
      },
    },
    {
      $sort: { unit_name: 1 },
    },
    {
      $project: {
        unit_name: 1,
      },
    },
  ]);
  res.status(200).json({
    result: list,
    status: true,
    message: 'Unit Dropdown List',
  });
});

// add tally item name
export const create_unit_helper = async (itemId) => {
  const pipeline = [
    { $match: { _id: mongoose.Types.ObjectId.createFromHexString(itemId.toString()) } },
    {
      $lookup: {
        from: 'units',
        localField: '_id',
        foreignField: '_id',
        as: 'unit_details',
      },
    },
    { $unwind: { path: '$unit_details', preserveNullAndEmptyArrays: true } },
  ];

  const result = await UnitModel.aggregate(pipeline);
  const item = result[0];
  if (!item) throw new Error(`Item not found: ${itemId}`);
  // console.log("res: ", item);
  const xml = UnitJSONtoXML(item);
  // console.log("xml: ", xml);
  if (!xml) throw new Error("XML generation failed");

  const response = await sendToTally(xml);
  if (response.includes("<ERRORS>0</ERRORS>")) {
    await UnitModel.findByIdAndUpdate(itemId, {
      tally_unit_name: item.unit_name,
    });
  }

  const parser = new XMLParser();
  const parsed = parser.parse(response);
  const msg = parsed?.message ||
    parsed?.RESPONSE ||
    parsed?.ENVELOPE?.BODY?.IMPORTDATA?.RESPONSE ||
    parsed?.ENVELOPE?.BODY?.DATA?.IMPORTDATA?.RESPONSE ||
    {};

  const isSuccess = msg?.CREATED > 0 || msg?.ALTERED > 0;

  await UnitModel.findByIdAndUpdate(
    itemId,
    {
      $set: {
        tally_sync_status: isSuccess ? "SUCCESSFUL" : "FAILED",
      },
    },
    { new: true }
  );

  return parsed.RESPONSE || parsed.ENVELOPE?.BODY?.DATA?.IMPORTDATA?.RESPONSE || parsed;
};

// retry api for tally item name
export const create_unit = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const response = await create_unit_helper(id);

    res.status(200).json({
      success: true,
      message: "Invoice pushed to Tally",
      response,
    });
  } catch (err) {
    next(err);
  }
});
