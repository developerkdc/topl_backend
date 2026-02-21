import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import challan_done_model from '../../../database/schema/challan/challan_done/challan_done.schema.js';
import { isValidObjectId } from 'mongoose';
import {
  challan_status,
  transaction_type,
} from '../../../database/Utils/constants/constants.js';
import transporterModel from '../../../database/schema/masters/transporter.schema.js';
import moment from 'moment';
import { getStateCode } from '../../../utils/stateCode.js';
import { EwayBillHeaderVariable } from '../../../middlewares/ewaybillAuth.middleware.js';
import errorCodeMapForEwayBill from '../../dispatch/errorCodeMapForEwayBill.js';
import axios from 'axios';
import { parseGovEwayDate } from '../../../utils/date/govDateConverter.js';
import itemCategoryModel from '../../../database/schema/masters/item.category.schema.js';
import UnitModel from '../../../database/schema/masters/unit.schema.js';
// import errorCodeMapForEwayBill from './errorCodeMapForEwayBill.js';

export const create_challan = catchAsync(async (req, res) => {
  const { challan_details } = req.body;
  const userDetails = req.userDetails;

  if (!challan_details) {
    throw new ApiError(
      'Challan details are required.',
      StatusCodes.BAD_REQUEST
    );
  }

  if (!Array.isArray(challan_details?.raw_material_items)) {
    throw new ApiError(
      'Raw material items must be an array',
      StatusCodes.BAD_REQUEST
    );
  }
  if (challan_details?.raw_material_items?.length === 0) {
    throw new ApiError(
      'Raw material items array must have an item',
      StatusCodes.BAD_REQUEST
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const issued_for_challan_details = await issue_for_challan_model
      .find({ _id: { $in: challan_details?.raw_material_items } })
      .session(session);

    if (issued_for_challan_details?.length === 0) {
      throw new ApiError(
        'Issued for challan items not found.',
        StatusCodes.NOT_FOUND
      );
    }

    const getFinancialYear = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth(); // 0 = Jan, 11 = Dec
      const fyStartYear = month >= 3 ? year : year - 1;
      const fyEndYear = fyStartYear + 1;
      return `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`;
    };

    const latestChallan = await challan_done_model
      .findOne({}, { challan_no: 1 })
      .sort({ createdAt: -1 });

    let latest_challan_no;
    const currentFY = getFinancialYear();

    if (latestChallan?.challan_no) {
      const [fullPart, fyPart] = latestChallan.challan_no.split('/'); // e.g., "CH1", "25-26"
      const prevFY = fyPart;
      const challanNumber = parseInt(fullPart.replace('CH', ''));

      if (prevFY === currentFY) {
        latest_challan_no = `CH${challanNumber + 1}/${currentFY}`;
      } else {
        latest_challan_no = `CH1/${currentFY}`;
      }
    } else {
      latest_challan_no = `CH1/${currentFY}`; // First challan ever
    }

    const updated_details = {
      ...challan_details,
      challan_no: latest_challan_no,
      created_by: userDetails?._id,
      updated_by: userDetails?._id,
    };

    const [create_challan_result] = await challan_done_model.create(
      [updated_details],
      { session }
    );

    if (!create_challan_result) {
      throw new ApiError('Failed to create challan.', StatusCodes.BAD_REQUEST);
    }

    const update_issue_for_challan_update_result =
      await issue_for_challan_model.updateMany(
        { _id: { $in: challan_details?.raw_material_items } },
        {
          $set: {
            is_challan_done: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_challan_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for challan details not found.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_issue_for_challan_update_result.acknowledged ||
      update_issue_for_challan_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issued for challan status',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.CREATED,
      'Challan generated successfully',
      create_challan_result
    );
    await session.commitTransaction();
    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const listing_challan_done = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sort = 'desc',
    search = '',
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  const aggIssuedChallanDetailsLookup = {
    $lookup: {
      from: 'issue_for_challan_details',
      localField: 'raw_material_items',
      foreignField: '_id',
      as: 'issue_for_challan_item_details',
    },
  };
  const aggCustomerDetailsLookup = {
    $lookup: {
      from: 'customers',
      localField: 'customer_id',
      foreignField: '_id',
      as: 'customer_details',
    },
  };

  const aggTransporterLookup = {
    $lookup: {
      from: 'transporters',
      localField: 'transporter_id',
      foreignField: '_id',
      as: 'transporter_details',
    },
  };
  const aggVehicleLookup = {
    $lookup: {
      from: 'vehicles',
      localField: 'vehicle_id',
      foreignField: '_id',
      as: 'vehicle_details',
    },
  };

  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'created_by',
    },
  };
  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'updated_by',
    },
  };
  const aggCreatedByUnwind = {
    $unwind: {
      path: '$created_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUpdatedByUnwind = {
    $unwind: {
      path: '$updated_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggCustomerDetailsUnwind = {
    $unwind: {
      path: '$customer_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggTransporterDetailsUnwind = {
    $unwind: {
      path: '$transporter_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggVehiclesDetailsUnwind = {
    $unwind: {
      path: '$vehicle_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  // const aggSort = {
  //   $sort: {
  //     [sortBy]: sort === 'desc' ? -1 : 1,
  //   },
  // };
  const aggAddChallanNoSort = {
    $addFields: {
      invoice_sort_key: {
        $add: [
          {
            $multiply: [
              {
                $convert: {
                  input: {
                    $getField: {
                      field: 'match',
                      input: {
                        $regexFind: {
                          input: { $ifNull: ['$challan_no', '0'] },
                          regex: '(?<=/)(\\d{2})',
                        },
                      },
                    },
                  },
                  to: 'int',
                  onError: 0,
                  onNull: 0,
                },
              },
              1000,
            ],
          },
          {
            $convert: {
              input: {
                $getField: {
                  field: 'match',
                  input: {
                    $regexFind: {
                      input: { $ifNull: ['$challan_no', '0'] },
                      regex: '^[0-9]+',
                    },
                  },
                },
              },
              to: 'int',
              onError: 0,
              onNull: 0,
            },
          },
        ],
      },
    },
  };
  const aggSort = {
    $sort:
      sortBy === 'challan_no'
        ? {
            challan_no_sort_key: sort === 'desc' ? -1 : 1,
            challan_no: sort === 'desc' ? -1 : 1,
          }
        : { [sortBy]: sort === 'desc' ? -1 : 1 },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggIssuedChallanDetailsLookup,
    aggCustomerDetailsLookup,
    aggCustomerDetailsUnwind,
    aggTransporterLookup,
    aggTransporterDetailsUnwind,
    aggVehicleLookup,
    aggVehiclesDetailsUnwind,
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggAddChallanNoSort,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const issue_for_color = await challan_done_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const totalDocument = await challan_done_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Challan details fetched successfully',
    {
      data: issue_for_color,
      totalPages: totalPages,
    }
  );
  return res.status(StatusCodes.OK).json(response);
});

export const edit_challan_details = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { challan_details } = req.body;
  const userDetails = req.userDetails;

  if (!id) {
    throw new ApiError('ID is missing.', StatusCodes.NOT_FOUND);
  }
  if (!challan_details) {
    throw new ApiError('Challan details are required.', StatusCodes.NOT_FOUND);
  }

  if (!Array.isArray(challan_details?.raw_material_items)) {
    throw new ApiError(
      'Raw material items must be an array',
      StatusCodes.BAD_REQUEST
    );
  }
  if (challan_details?.raw_material_items?.length === 0) {
    throw new ApiError(
      'Raw material items array must have an item',
      StatusCodes.BAD_REQUEST
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const challan_done_details = await challan_done_model
      .findById(id)
      .session(session);
    if (!challan_done_details) {
      throw new ApiError(
        'Challan done details not found',
        StatusCodes.NOT_FOUND
      );
    }

    const update_existing_issue_for_challan_status_result =
      await issue_for_challan_model.updateMany(
        { _id: { $in: challan_done_details?.raw_material_items } },
        {
          $set: {
            is_challan_done: false,
          },
        },
        { session }
      );

    if (update_existing_issue_for_challan_status_result?.matchedCount === 0) {
      throw new ApiError(
        'Failed to update issue for challan status',
        StatusCodes.BAD_REQUEST
      );
    }
    if (
      !update_existing_issue_for_challan_status_result?.acknowledged ||
      update_existing_issue_for_challan_status_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issue for challan status',
        StatusCodes.BAD_REQUEST
      );
    }
    const updated_details = {
      ...challan_details,
      updated_by: userDetails?._id,
    };

    const update_challan_details = await challan_done_model.updateOne(
      { _id: challan_done_details?._id },
      { $set: updated_details },
      { session }
    );

    if (
      !update_challan_details?.acknowledged ||
      update_challan_details?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update challan details.',
        StatusCodes.BAD_REQUEST
      );
    }

    const update_issue_for_challan_update_result =
      await issue_for_challan_model.updateMany(
        { _id: { $in: challan_details?.raw_material_items } },
        {
          $set: {
            is_challan_done: true,
            updated_by: userDetails?._id,
          },
        },
        { session }
      );

    if (update_issue_for_challan_update_result?.matchedCount === 0) {
      throw new ApiError(
        'Issue for challan details not found.',
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      !update_issue_for_challan_update_result.acknowledged ||
      update_issue_for_challan_update_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update issued for challan status',
        StatusCodes.BAD_REQUEST
      );
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Challan updated successfully.',
      update_challan_details
    );
    await session.commitTransaction();
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const update_inward_challan_status_by_challan_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;
    const userDetails = req.userDetails;
    if (!id) {
      throw new ApiError('ID is missing.', StatusCodes.NOT_FOUND);
    }

    if (!isValidObjectId(id)) {
      throw new ApiError('Invalid ID', StatusCodes.BAD_REQUEST);
    }

    const update_status_result = await challan_done_model.updateOne(
      { _id: id },
      {
        $set: {
          inward_challan_status: challan_status?.received,
          updated_by: userDetails?._id,
        },
      }
    );

    if (update_status_result?.matchedCount === 0) {
      throw new ApiError('Challan done item not found.', StatusCodes.NOT_FOUND);
    }
    if (
      !update_status_result?.acknowledged ||
      update_status_result?.modifiedCount === 0
    ) {
      throw new ApiError(
        'Failed to update challan status.',
        StatusCodes.BAD_REQUEST
      );
    }
    const response = new ApiResponse(
      StatusCodes.OK,
      'Inward Challan received successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  }
);

export const challan_no_dropdown = catchAsync(async (req, res, next) => {
  try {
    const challanList = await challan_done_model
      .find({}, { _id: 1, challan_no: 1 })
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      result: challanList.map((c) => ({
        _id: c._id,
        challan_no: c.challan_no,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export const listing_single_challan = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const matchquery = {
    $match: {
      _id: mongoose.Types.ObjectId.createFromHexString(id),
    },
  };
  const aggIssuedChallanDetailsLookup = {
    $lookup: {
      from: 'issue_for_challan_details',
      localField: 'raw_material_items',
      foreignField: '_id',
      as: 'issue_for_challan_item_details',
    },
  };
  const aggCustomerDetailsLookup = {
    $lookup: {
      from: 'customers',
      localField: 'customer_id',
      foreignField: '_id',
      as: 'customer_details',
    },
  };

  // const aggTransporterLookup = {
  //   $lookup: {
  //     from: 'transporters',
  //     localField: 'transporter_id',
  //     foreignField: '_id',
  //     as: 'transporter_details',
  //   },
  // };
  // const aggVehicleLookup = {
  //   $lookup: {
  //     from: 'vehicles',
  //     localField: 'vehicle_id',
  //     foreignField: '_id',
  //     as: 'vehicle_details',
  //   },
  // };

  // const aggCreatedByLookup = {
  //   $lookup: {
  //     from: 'users',
  //     localField: 'created_by',
  //     foreignField: '_id',
  //     pipeline: [
  //       {
  //         $project: {
  //           user_name: 1,
  //           user_type: 1,
  //           dept_name: 1,
  //           first_name: 1,
  //           last_name: 1,
  //           email_id: 1,
  //           mobile_no: 1,
  //         },
  //       },
  //     ],
  //     as: 'created_by',
  //   },
  // };
  // const aggUpdatedByLookup = {
  //   $lookup: {
  //     from: 'users',
  //     localField: 'updated_by',
  //     foreignField: '_id',
  //     pipeline: [
  //       {
  //         $project: {
  //           user_name: 1,
  //           user_type: 1,
  //           dept_name: 1,
  //           first_name: 1,
  //           last_name: 1,
  //           email_id: 1,
  //           mobile_no: 1,
  //         },
  //       },
  //     ],
  //     as: 'updated_by',
  //   },
  // };
  const aggIssueForChallanUnwind = {
    $unwind: {
      path: '$issue_for_challan_item_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  // const aggUpdatedByUnwind = {
  //   $unwind: {
  //     path: '$updated_by',
  //     preserveNullAndEmptyArrays: true,
  //   },
  // };
  const aggCustomerDetailsUnwind = {
    $unwind: {
      path: '$customer_details',
      preserveNullAndEmptyArrays: true,
    },
  };
  // const aggTransporterDetailsUnwind = {
  //   $unwind: {
  //     path: '$transporter_details',
  //     preserveNullAndEmptyArrays: true,
  //   },
  // };
  // const aggVehiclesDetailsUnwind = {
  //   $unwind: {
  //     path: '$vehicle_details',
  //     preserveNullAndEmptyArrays: true,
  //   },
  // };

  const listAggregate = [
    matchquery,
    aggIssuedChallanDetailsLookup,
    // aggIssueForChallanUnwind
    aggCustomerDetailsLookup,
    aggCustomerDetailsUnwind,
    // aggTransporterLookup,
    // aggTransporterDetailsUnwind,
    // aggVehicleLookup,
    // aggVehiclesDetailsUnwind,
    // aggCreatedByLookup,
    // aggCreatedByUnwind,
    // aggUpdatedByLookup,
    // aggUpdatedByUnwind,
  ]; // aggregation pipiline

  const issue_for_color = await challan_done_model.aggregate(listAggregate);

  const response = new ApiResponse(
    StatusCodes.OK,
    'Challan details fetched successfully',
    issue_for_color
  );
  return res.status(StatusCodes.OK).json(response);
});

export const generate_challan_ewaybill = catchAsync(async (req, res, next) => {
  const challan_id = req.params.id;
  const matchQuery = {
    $match: {
      _id: mongoose.Types.ObjectId.createFromHexString(challan_id),
    },
  };
  const aggIssuedChallanDetailsLookup = {
    $lookup: {
      from: 'issue_for_challan_details',
      localField: 'raw_material_items',
      foreignField: '_id',
      as: 'issue_for_challan_item_details',
    },
  };
  const listAggregate = [matchQuery, aggIssuedChallanDetailsLookup];

  if (!challan_id) {
    throw new ApiError('Challan ID is missing.', StatusCodes.NOT_FOUND);
  }
  if (!isValidObjectId(challan_id)) {
    throw new ApiError('Invalid Challan ID', StatusCodes.BAD_REQUEST);
  }

  const challanDetails = await challan_done_model.aggregate(listAggregate);
  if (!challanDetails || challanDetails.length === 0) {
    throw new ApiError('Challan details not found', StatusCodes.NOT_FOUND);
  }
  const challan_details = challanDetails[0];
  const issue_for_challan_item_details =
    challan_details?.issue_for_challan_item_details;

  if (
    !issue_for_challan_item_details ||
    issue_for_challan_item_details.length === 0
  ) {
    throw new ApiError(
      'Issue for challan item details not found',
      StatusCodes.NOT_FOUND
    );
  }

  console.log('challanDetails', challan_details, 'challanDetails');
  console.log(
    'issue_for_challan_item_details',
    issue_for_challan_item_details,
    'issue_for_challan_item_details'
  );

  //get hsn code and unit form category for raw material
  const itemCategory = await itemCategoryModel.findOne({
    category: challan_details?.raw_material?.toUpperCase(),
  });
  if (!itemCategory) {
    throw new ApiError('Item category not found', StatusCodes.NOT_FOUND);
  }
  const hsnCode = itemCategory?.product_hsn_code;
  const unit = itemCategory?.calculate_unit;
  //find this unit in unit master to get symbolic name
  const unitDetails = await UnitModel.findOne({
    unit_name: unit,
  });
  if (!unitDetails) {
    throw new ApiError('Unit not found', StatusCodes.NOT_FOUND);
  }
  const unitSymbolicName = unitDetails?.unit_symbolic_name;
  console.log('hsnCode', hsnCode, 'hsnCode');
  console.log('unit', unit, 'unit');

  // Optionally, eager load related entities (transporter, vehicle) if you need deeper metadata, like dispatch
  let transporter_details = challan_details.transporter_details;
  if (challan_details.transporter_id) {
    transporter_details = await transporterModel.findOne({
      _id: challan_details.transporter_id,
    });
  }
  console.log('transporter_details', transporter_details, 'transporter_details');

  const address = challan_details.address || {};
  const {
    bill_from_address,
    bill_to_address,
    dispatch_from_address,
    ship_to_address,
  } = address;

  // Transaction type mapping (mimic dispatch logic: 1=Regular, 2=Bill to Ship to, 3=Bill from Dispatch from, 4=Both). Fallback to 1.
  let transactionType;
  switch (challan_details?.transaction_type) {
    case transaction_type?.regular:
    case 1:
      transactionType = 1;
      break;
    case transaction_type?.bill_to_ship_to:
    case 2:
      transactionType = 2;
      break;
    case transaction_type?.bill_from_dispatch_from:
    case 3:
      transactionType = 3;
      break;
    case transaction_type?.bill_to_ship_to_and_bill_from_dispatch_from:
    case 4:
      transactionType = 4;
      break;
    default:
      transactionType = 1;
  }

  const ewayBillBody = {
    supplyType: 'O', // Outward
    subSupplyType: '4', // Job work (for challan) -- adjust if required
    subSupplyDesc: '',
    docType: 'CHL', // Challan
    docNo: challan_details?.challan_no,
    docDate: challan_details?.challan_date
      ? moment(challan_details.challan_date).format('DD/MM/YYYY')
      : '',
    // Seller details
    fromGstin: bill_from_address?.gst_number,
    fromTrdName: 'TURAKHIA OVERSEAS PVT. LTD.',
    fromAddr1:
      dispatch_from_address?.address &&
      dispatch_from_address.address.length > 50
        ? dispatch_from_address.address.slice(0, 50)
        : dispatch_from_address?.address || '',
    fromAddr2:
      dispatch_from_address?.address &&
      dispatch_from_address.address.length > 50
        ? dispatch_from_address.address.slice(50)
        : '',
    fromPlace: dispatch_from_address?.city || '',
    actFromStateCode: getStateCode(dispatch_from_address?.state),
    fromPincode: Number(dispatch_from_address?.pincode) || '',
    fromStateCode: getStateCode(dispatch_from_address?.state),

    toGstin:
      bill_to_address?.gst_number ||
      challan_details?.customer_details?.gst_number ||
      '',
    toTrdName:
      challan_details?.customer_details?.legal_name ||
      challan_details?.customer_name ||
      '',

    toAddr1:
      ship_to_address?.address && ship_to_address.address.length > 50
        ? ship_to_address.address.slice(0, 50)
        : ship_to_address?.address || '',
    toAddr2:
      ship_to_address?.address && ship_to_address.address.length > 50
        ? ship_to_address.address.slice(50)
        : '',
    toPlace: ship_to_address?.city || '',
    toPincode: Number(ship_to_address?.pincode) || '',
    actToStateCode: getStateCode(ship_to_address?.state),
    toStateCode: getStateCode(ship_to_address?.state),

    transactionType: transactionType,

    dispatchFromGSTIN: dispatch_from_address?.gst_number,
    dispatchFromTradeName: 'TURAKHIA OVERSEAS PVT. LTD.',

    // Buyer details

    shipToGSTIN:
      ship_to_address?.gst_number ||
      challan_details?.customer_details?.gst_number ||
      '',
    shipToTradeName:
      challan_details?.customer_details?.legal_name ||
      challan_details?.customer_name ||
      '',

    totalValue:
      challan_details?.base_amount ||
      challan_details?.base_amount_without_gst ||
      0,

    cgstValue: challan_details?.cgst ? challan_details?.gst_amount / 2 : 0,
    sgstValue: challan_details?.sgst ? challan_details?.gst_amount / 2 : 0,
    igstValue: challan_details?.igst ? challan_details?.gst_amount : 0,
    // cessValue: challan_details?.cess_value || 0,
    totInvValue:
      challan_details?.grand_total || challan_details?.total_amount || 0,

    // Transport details
    transMode: challan_details?.transport_mode?.id,
    transDistance: challan_details?.approx_distance?.toString() || '',
    transporterName: transporter_details?.name,
    transporterId: transporter_details?.transport_id,
    // transporterId: "23AACFA2856L1ZJ",
    transDocNo: challan_details?.transport_document_no,
    transDocDate: challan_details?.transport_document_date
      ? moment(challan_details.transport_document_date, [
          'DD/MM/YYYY',
          'YYYY-MM-DD',
        ]).format('DD/MM/YYYY')
      : '',
    vehicleNo: challan_details?.vehicle_name,
    vehicleType: 'R',

    // Items
    itemList: (issue_for_challan_item_details || []).map((item) => ({
      // Pick fields in similar manner as dispatch
      productName:
        item?.product_name ||
        item?.product_category ||
        item?.issued_item_details?.item_name ||
        '',
      productDesc:
        item?.product_desc ||
        item?.sales_item_name ||
        item?.product_category ||
        item?.issued_item_details?.item_name ||
        '',
      hsnCode: item?.hsn_code || hsnCode,
      quantity:
        item?.issued_item_details?.quantity ||
        item?.issued_item_details?.new_sqm ||
        item?.issued_item_details?.sqm ||
        item?.issued_item_details?.cbm ||
        item?.issued_item_details?.cmt ||
        item?.issued_item_details?.physical_cmt ||
        0,
      qtyUnit: item?.issued_item_details?.unit || unitSymbolicName,
      taxableAmount: item?.issued_item_details?.amount || 0,
      sgstRate: challan_details?.sgst || 0,
      cgstRate: challan_details?.cgst || 0,
      igstRate: challan_details?.igst || 0,
      // cessRate: item?.cess_rate || 0,
    })),
  };

  console.log('Challan ewayBillBody', ewayBillBody, 'Challan ewayBillBody');

  const ewayBillResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/genewaybill?email=${process.env.EWAY_BILL_EMAIL_ID}`,
    ewayBillBody,
    {
      headers: {
        ...EwayBillHeaderVariable,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(
    'Challan ewayBillResponse',
    ewayBillResponse.data,
    'Challan ewayBillResponse'
  );

  if (ewayBillResponse?.data?.status_cd === '1') {
    const { ewayBillNo, ewayBillDate, validUpto } = ewayBillResponse?.data?.data;
    // Save the updated challan details in challan_done_model
    await challan_done_model.updateOne(
      { _id: challan_details._id },
      {
        $set: {
          eway_bill_no: ewayBillNo,
          eway_bill_date: parseGovEwayDate(ewayBillDate) || Date.now(),
          eway_bill_valid_upto: parseGovEwayDate(validUpto) || null,
          eway_bill_status: 'ACTIVE',
        },
      }
    );
    // await challan_details.save();
  } else {
    let errorMessage = 'Unknown error occurred';
    const error = ewayBillResponse?.data?.error;

    if (error && typeof error === 'object' && error.message) {
      const message = error.message;

      // Handle multiple validation errors: "[#/field1: error1, #/field2: error2]"
      const arrayMatch = message.match(/\[(.*?)\]/);
      if (arrayMatch?.[1]) {
        const errors = arrayMatch[1].split(/, #\//);
        if (errors.length > 0) {
          let firstError = errors[0].trim();
          if (firstError.startsWith('#/')) {
            firstError = firstError.substring(2);
          }
          errorMessage = firstError;
        } else {
          errorMessage = message;
        }
      }
      // Handle JSON error codes: '{"errorCodes":"100"}'
      else {
        try {
          const parsedError = JSON.parse(message);
          if (parsedError?.errorCodes) {
            const errorCode = parsedError.errorCodes.split(',')[0]?.trim();
            if (errorCode) {
              // Build error code map for lookup
              const errorCodeMap = {};
              if (
                errorCodeMapForEwayBill &&
                Array.isArray(errorCodeMapForEwayBill)
              ) {
                for (const e of errorCodeMapForEwayBill) {
                  errorCodeMap[e.errorCode] = e.errorDesc;
                }
              }
              errorMessage =
                errorCodeMap[errorCode] ||
                `Eway Bill API Error. Error Code: ${errorCode}`;
            } else {
              errorMessage = message;
            }
          } else {
            // Handle single validation error: "#/itemList/0/qtyUnit: expected minLength: 3, actual: 0"
            const singleMatch = message.match(/#\/(.+)/);
            errorMessage = singleMatch?.[1]?.trim() || message;
          }
        } catch {
          // Handle single validation error if JSON parse fails: "#/itemList/0/qtyUnit: expected minLength: 3, actual: 0"
          const singleMatch = message.match(/#\/(.+)/);
          errorMessage = singleMatch?.[1]?.trim() || message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Generation Failed for Challan. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return res.status(200).json({
    success: true,
    message: 'Challan EWay Bill generated successfully.',
    result: ewayBillResponse?.data,
  });
});

export const get_ewaybill_details = catchAsync(async (req, res, next) => {
  const challan_id = req.params.id;
  const matchQuery = {
    $match: {
      _id: mongoose.Types.ObjectId.createFromHexString(challan_id),
    },
  };
  const aggIssuedChallanDetailsLookup = {
    $lookup: {
      from: 'issue_for_challan_details',
      localField: 'raw_material_items',
      foreignField: '_id',
      as: 'issue_for_challan_item_details',
    },
  };
  const listAggregate = [matchQuery, aggIssuedChallanDetailsLookup];

  if (!challan_id) {
    throw new ApiError('Challan ID is missing.', StatusCodes.NOT_FOUND);
  }
  if (!isValidObjectId(challan_id)) {
    throw new ApiError('Invalid Challan ID', StatusCodes.BAD_REQUEST);
  }

  const challanDetails = await challan_done_model.aggregate(listAggregate);
  if (!challanDetails || challanDetails.length === 0) {
    throw new ApiError('Challan details not found', StatusCodes.NOT_FOUND);
  }
  const challan_details = challanDetails[0];
  const issue_for_challan_item_details =
    challan_details?.issue_for_challan_item_details;

  if (
    !issue_for_challan_item_details ||
    issue_for_challan_item_details.length === 0
  ) {
    throw new ApiError(
      'Issue for challan item details not found',
      StatusCodes.NOT_FOUND
    );
  }

  console.log('challanDetails', challan_details, 'challanDetails');
  console.log(
    'issue_for_challan_item_details',
    issue_for_challan_item_details,
    'issue_for_challan_item_details'
  );

  const ewayBillResponse = await axios.get(
    challan_details?.eway_bill_no
      ? `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/getewaybill?email=${process.env.EWAY_BILL_EMAIL_ID}&ewbNo=${challan_details?.eway_bill_no}`
      : `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/getewaybillgeneratedbyconsigner?email=${process.env.EWAY_BILL_EMAIL_ID}&docType=CHL&docNo=${challan_details?.challan_no}`,
    {
      headers: {
        ...EwayBillHeaderVariable,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(
    'Challan ewayBillResponse',
    ewayBillResponse.data,
    'Challan ewayBillResponse'
  );

  if (ewayBillResponse?.data?.status_cd === '1') {
    if (challan_details?.eway_bill_no) {
      const { ewbNo, ewayBillDate, status, validUpto } = ewayBillResponse?.data?.data;
      await challan_done_model.updateOne(
        { _id: challan_details._id },
        {
          $set: {
            eway_bill_no: ewbNo,
            eway_bill_date: parseGovEwayDate(ewayBillDate),
            eway_bill_valid_upto: parseGovEwayDate(validUpto),
            eway_bill_status: status === 'CNL' ? 'CANCELLED' : 'ACTIVE',
          },
        }
      );
    } else {
      const { ewayBillNo, ewayBillDate, validUpto } = ewayBillResponse?.data?.data;
      await challan_done_model.updateOne(
        { _id: challan_details._id },
        {
          $set: {
            eway_bill_no: ewayBillNo,
            eway_bill_date: parseGovEwayDate(ewayBillDate),
            eway_bill_valid_upto: parseGovEwayDate(validUpto),
          },
        }
      );
    }
  } else {
    let errorMessage = 'Unknown error occurred';
    const error = ewayBillResponse?.data?.error;

    if (error && typeof error === 'object' && error.message) {
      const message = error.message;

      // Handle multiple validation errors: "[#/field1: error1, #/field2: error2]"
      const arrayMatch = message.match(/\[(.*?)\]/);
      if (arrayMatch?.[1]) {
        const errors = arrayMatch[1].split(/, #\//);
        if (errors.length > 0) {
          let firstError = errors[0].trim();
          if (firstError.startsWith('#/')) {
            firstError = firstError.substring(2);
          }
          errorMessage = firstError;
        } else {
          errorMessage = message;
        }
      }
      // Handle JSON error codes: '{"errorCodes":"100"}'
      else {
        try {
          const parsedError = JSON.parse(message);
          if (parsedError?.errorCodes) {
            const errorCode = parsedError.errorCodes.split(',')[0]?.trim();
            if (errorCode) {
              // Build error code map for lookup
              const errorCodeMap = {};
              if (
                errorCodeMapForEwayBill &&
                Array.isArray(errorCodeMapForEwayBill)
              ) {
                for (const e of errorCodeMapForEwayBill) {
                  errorCodeMap[e.errorCode] = e.errorDesc;
                }
              }
              errorMessage =
                errorCodeMap[errorCode] ||
                `Eway Bill API Error. Error Code: ${errorCode}`;
            } else {
              errorMessage = message;
            }
          } else {
            // Handle single validation error: "#/itemList/0/qtyUnit: expected minLength: 3, actual: 0"
            const singleMatch = message.match(/#\/(.+)/);
            errorMessage = singleMatch?.[1]?.trim() || message;
          }
        } catch {
          // Handle single validation error if JSON parse fails: "#/itemList/0/qtyUnit: expected minLength: 3, actual: 0"
          const singleMatch = message.match(/#\/(.+)/);
          errorMessage = singleMatch?.[1]?.trim() || message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Details Fetch Failed for Challan. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return res.status(200).json({
    success: true,
    message: 'Challan EWay Bill details fetched successfully.',
    result: ewayBillResponse?.data,
  });
});

export const cancel_challan_ewaybill = catchAsync(async (req, res, next) => {
  const { cancelRmrk, cancelRsnCode } = req.body;

  const challan_id = req.params.id;
  const challan_details = await challan_done_model.findById(challan_id);

  if (!challan_details) {
    throw new ApiError('Challan details not found', StatusCodes.NOT_FOUND);
  }

  if (!challan_details?.eway_bill_no) {
    throw new ApiError(
      'Eway bill number not found for this challan',
      StatusCodes.BAD_REQUEST
    );
  }

  const ewayBillCancelBody = {
    ewbNo: challan_details?.eway_bill_no,
    cancelRmrk: cancelRmrk,
    cancelRsnCode: Number(cancelRsnCode),
  };

  const ewayBillCancelResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/canewb?email=${process.env.EWAY_BILL_EMAIL_ID}`,
    ewayBillCancelBody,
    {
      headers: {
        ...EwayBillHeaderVariable,
        // 'auth-token': authToken,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(
    'ewayBillCancelResponse',
    ewayBillCancelResponse.data,
    'ewayBillCancelResponse'
  );

  if (ewayBillCancelResponse?.data?.status_cd === '1') {
    await challan_done_model.updateOne(
      { _id: challan_details._id },
      {
        $set: {
          eway_bill_status: 'CANCELLED',
        },
      }
    );
    console.log('Eway Bill Cancelled successfully.');
  } else {
    // Extracting error details from ewayBillCancelResponse and throwing an error
    let errorMessage = 'Unknown error occurred';

    if (ewayBillCancelResponse?.data?.error) {
      if (
        typeof ewayBillCancelResponse.data.error === 'object' &&
        ewayBillCancelResponse.data.error.message
      ) {
        const message = ewayBillCancelResponse.data.error.message;

        const arrayMatch = message.match(/\[(.*?)\]/);
        if (arrayMatch && arrayMatch[1]) {
          // Handle "required key" style error messages
          const errors = arrayMatch[1].split(/, #\//);
          if (errors.length > 0) {
            let firstError = errors[0].trim();
            if (firstError.startsWith('#/')) {
              firstError = firstError.substring(2);
            }
            errorMessage = firstError;
          } else {
            errorMessage = message;
          }
        } else if (/^\{.*errorCodes.*\}$/.test(message)) {
          // Handle JSON error style messages, e.g. '{"errorCodes":"312,"}'
          let errorCode = null;
          try {
            const parsed = JSON.parse(message);
            if (parsed?.errorCodes) {
              // Sometimes there may be a trailing comma, split and clean
              errorCode = parsed.errorCodes.split(',')[0]?.trim();
            }
          } catch (e) {}
          // Provide specific error messages for known error codes
          // You can expand or modify this map as needed
          const errorCodeMap = {};
          // Build a map from the imported array for fast lookup
          for (const errorObj of errorCodeMapForEwayBill) {
            errorCodeMap[errorObj.errorCode] = errorObj.errorDesc;
          }
          if (errorCode && errorCodeMap[errorCode]) {
            errorMessage = errorCodeMap[errorCode];
          } else if (errorCode) {
            errorMessage = `Eway Bill API Error. Error Code: ${errorCode}`;
          } else {
            errorMessage = message;
          }
        } else {
          errorMessage = message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Cancellation Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return res.status(200).json({
    success: true,
    message: 'Eway Bill Cancelled successfully.',
    result: ewayBillCancelResponse?.data,
  });
});
export const update_ewaybill_transporter = catchAsync(
  async (req, res, next) => {
    const { transporter_id } = req.body;

    const challan_id = req.params.id;
    const challan_details = await challan_done_model.findById(challan_id);

    if (!challan_details) {
      throw new ApiError('Challan details not found', StatusCodes.NOT_FOUND);
    }

    if (!challan_details?.eway_bill_no) {
      throw new ApiError(
        'Eway bill number not found for this challan',
        StatusCodes.BAD_REQUEST
      );
    }
    const transporterDetails = await transporterModel.findById(transporter_id);
    if (!transporterDetails) {
      throw new ApiError(
        'Transporter details not found',
        StatusCodes.NOT_FOUND
      );
    }
    console.log('transporterDetails', transporterDetails, 'transporterDetails');

    const ewayBillUpdateTransporterBody = {
      ewbNo: challan_details?.eway_bill_no,
      transporterId: transporterDetails?.transport_id,
    };
    console.log(
      'Challan ewayBillUpdateTransporterBody',
      ewayBillUpdateTransporterBody,
      'Challan ewayBillUpdateTransporterBody'
    );

    const ewayBillUpdateTransporterResponse = await axios.post(
      `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/updatetransporter?email=${process.env.EWAY_BILL_EMAIL_ID}`,
      ewayBillUpdateTransporterBody,
      {
        headers: {
          ...EwayBillHeaderVariable,
          // 'auth-token': authToken,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(
      'ewayBillUpdateTransporterResponse',
      ewayBillUpdateTransporterResponse.data,
      'ewayBillUpdateTransporterResponse'
    );

    if (ewayBillUpdateTransporterResponse?.data?.status_cd === '1') {
      await challan_done_model.updateOne(
        { _id: challan_details._id },
        {
          $set: {
            transporter_name: transporterDetails?.name,
            transporter_details: transporterDetails,
            transporter_id: transporterDetails?._id,
          },
        }
      );
    } else {
      // Extracting error details from ewayBillCancelResponse and throwing an error
      let errorMessage = 'Unknown error occurred';

      if (ewayBillUpdateTransporterResponse?.data?.error) {
        if (
          typeof ewayBillUpdateTransporterResponse.data.error === 'object' &&
          ewayBillUpdateTransporterResponse.data.error.message
        ) {
          const message = ewayBillUpdateTransporterResponse.data.error.message;

          const arrayMatch = message.match(/\[(.*?)\]/);
          if (arrayMatch && arrayMatch[1]) {
            // Handle "required key" style error messages
            const errors = arrayMatch[1].split(/, #\//);
            if (errors.length > 0) {
              let firstError = errors[0].trim();
              if (firstError.startsWith('#/')) {
                firstError = firstError.substring(2);
              }
              errorMessage = firstError;
            } else {
              errorMessage = message;
            }
          } else if (/^\{.*errorCodes.*\}$/.test(message)) {
            // Handle JSON error style messages, e.g. '{"errorCodes":"312,"}'
            let errorCode = null;
            try {
              const parsed = JSON.parse(message);
              if (parsed?.errorCodes) {
                // Sometimes there may be a trailing comma, split and clean
                errorCode = parsed.errorCodes.split(',')[0]?.trim();
              }
            } catch (e) {}
            // Provide specific error messages for known error codes
            // You can expand or modify this map as needed
            const errorCodeMap = {};
            // Build a map from the imported array for fast lookup
            for (const errorObj of errorCodeMapForEwayBill) {
              errorCodeMap[errorObj.errorCode] = errorObj.errorDesc;
            }
            if (errorCode && errorCodeMap[errorCode]) {
              errorMessage = errorCodeMap[errorCode];
            } else if (errorCode) {
              errorMessage = `Eway Bill API Error. Error Code: ${errorCode}`;
            } else {
              errorMessage = message;
            }
          } else {
            errorMessage = message;
          }
        }
      }

      throw new ApiError(
        `Eway Bill Update Transporter Failed. Error : ${errorMessage}`,
        StatusCodes.BAD_REQUEST
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Eway Bill Update Transporter successfully.',
      result: ewayBillUpdateTransporterResponse?.data,
    });
  }
);
export const update_ewaybill_partB = catchAsync(async (req, res, next) => {
  const challan_id = req.params.id;
  const {
    vehicle_name,
    address,
    state,
    reasonCode,
    reasonRem,
    transport_document_no,
    transport_document_date,
    transMode,
    city,
    pincode,
  } = req.body;

  if (
    !vehicle_name ||
    !address ||
    !state ||
    !reasonCode ||
    !reasonRem ||
    !transport_document_no ||
    !transport_document_date ||
    !transMode
  ) {
    throw new ApiError(
      'All Part-B fields are required.',
      StatusCodes.BAD_REQUEST
    );
  }

  const challan_details = await challan_done_model.findById(challan_id);
  if (!challan_details) {
    throw new ApiError('Challan details not found', StatusCodes.NOT_FOUND);
  }

  if (!challan_details?.eway_bill_no) {
    throw new ApiError(
      'Eway bill number not found for this challan',
      StatusCodes.BAD_REQUEST
    );
  }

  // Prepare payload as per e-waybill API spec for updatetransporterdetails/partb
  const ewayBillUpdatePartBBody = {
    ewbNo: challan_details?.eway_bill_no,
    vehicleNo: vehicle_name,
    fromPlace: address,
    fromState: getStateCode(state),
    reasonCode: reasonCode,
    reasonRem: reasonRem,
    transDocNo: transport_document_no,
    transDocDate:
      moment(transport_document_date, ['DD/MM/YYYY', 'YYYY-MM-DD']).format(
        'DD/MM/YYYY'
      ) || '',
    transMode: transMode?.id,
  };

  console.log(
    'Challan ewayBillUpdatePartBBody',
    ewayBillUpdatePartBBody,
    'Challan ewayBillUpdatePartBBody'
  );

  const ewayBillUpdatePartBResponse = await axios.post(
    `${process.env.E_INVOICE_BASE_URL}/ewaybillapi/v1.03/ewayapi/vehewb?email=${process.env.EWAY_BILL_EMAIL_ID}`,
    ewayBillUpdatePartBBody,
    {
      headers: {
        ...EwayBillHeaderVariable,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(
    'ewayBillUpdatePartBResponse',
    ewayBillUpdatePartBResponse.data,
    'ewayBillUpdatePartBResponse'
  );

  if (ewayBillUpdatePartBResponse?.data?.status_cd === '1') {
    // Update corresponding partB/transport details in challan_done_model
    await challan_done_model.updateOne(
      { _id: challan_details._id },
      {
        $set: {
          vehicle_name: vehicle_name,
          transport_document_no: transport_document_no,
          transport_document_date: transport_document_date,
          transport_mode: transMode,
          // partb_last_updated: new Date(), // optional for tracking
          'address.dispatch_from_address.address': address,
          'address.dispatch_from_address.state': state,
          'address.dispatch_from_address.city': city,
          // reason_code: reasonCode,
          // reason_remark: reasonRem,
          'address.dispatch_from_address.pincode': pincode,
        },
      }
    );
  } else {
    // Extracting error details
    let errorMessage = 'Unknown error occurred';

    if (ewayBillUpdatePartBResponse?.data?.error) {
      if (
        typeof ewayBillUpdatePartBResponse.data.error === 'object' &&
        ewayBillUpdatePartBResponse.data.error.message
      ) {
        const message = ewayBillUpdatePartBResponse.data.error.message;

        const arrayMatch = message.match(/\[(.*?)\]/);
        if (arrayMatch && arrayMatch[1]) {
          const errors = arrayMatch[1].split(/, #\//);
          if (errors.length > 0) {
            let firstError = errors[0].trim();
            if (firstError.startsWith('#/')) {
              firstError = firstError.substring(2);
            }
            errorMessage = firstError;
          } else {
            errorMessage = message;
          }
        } else if (/^\{.*errorCodes.*\}$/.test(message)) {
          let errorCode = null;
          try {
            const parsed = JSON.parse(message);
            if (parsed?.errorCodes) {
              errorCode = parsed.errorCodes.split(',')[0]?.trim();
            }
          } catch (e) {}
          const errorCodeMap = {};
          for (const errorObj of errorCodeMapForEwayBill) {
            errorCodeMap[errorObj.errorCode] = errorObj.errorDesc;
          }
          if (errorCode && errorCodeMap[errorCode]) {
            errorMessage = errorCodeMap[errorCode];
          } else if (errorCode) {
            errorMessage = `Eway Bill API Error. Error Code: ${errorCode}`;
          } else {
            errorMessage = message;
          }
        } else {
          errorMessage = message;
        }
      }
    }

    throw new ApiError(
      `Eway Bill Update PartB Failed. Error : ${errorMessage}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return res.status(200).json({
    success: true,
    message: 'Eway Bill Part-B updated successfully.',
    result: ewayBillUpdatePartBResponse?.data,
  });
});
