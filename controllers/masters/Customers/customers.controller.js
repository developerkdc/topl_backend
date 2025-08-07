import mongoose from 'mongoose';
import {
  customer_client_model,
  customer_model,
} from '../../../database/schema/masters/customer.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';

export const addCustomer = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customer, customer_client } = req.body;

    if (!customer) {
      return next(new ApiError('Required customer data', 400));
    }

    if (customer_client && !Array.isArray(customer_client)) {
      return next(new ApiError('customer client must be array'));
    }

    const authUserDetail = req.userDetails;

    const maxNumber = await customer_model.aggregate([
      {
        $group: {
          _id: null,
          max: { $max: '$sr_no' },
        },
      },
    ]);

    const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

    const customerData = {
      ...customer,
      sr_no: maxSrNo,
      created_by: authUserDetail?._id,
      updated_by: authUserDetail?._id,
    };

    const addedCustomer = await customer_model.create([customerData], {
      session: session,
    });

    if (!addedCustomer[0]) {
      return next(new ApiError('Failed to add customer', 400));
    }

    let addedCustomerClients = [];
    if (customer_client?.length > 0) {
      const customerClientData = customer_client?.map((data) => ({
        ...data,
        customer_id: addedCustomer?.[0]?._id,
        // created_by: authUserDetail?._id,
        // updated_by: authUserDetail?._id,
      }));

      addedCustomerClients = await customer_client_model.insertMany(
        customerClientData,
        {
          session: session,
        }
      );

      if (addedCustomerClients?.length <= 0) {
        return next(new ApiError('Failed to add customer client', 400));
      }
    }

    await session.commitTransaction();

    const response = new ApiResponse(201, 'Customer Added Successfully', {
      customer: addedCustomer[0],
      customer_client: addedCustomerClients,
    });

    return res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});

export const editCustomer = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid customer id', 400));
  }

  const authUserDetail = req.userDetails;
  const customer = req.body;

  const customerData = {
    company_name: customer?.company_name,
    customer_type: customer?.customer_type,
    owner_name: customer?.owner_name,
    supplier_type: customer?.supplier_type,
    dob: customer?.dob,
    email_id: customer?.email_id,
    web_url: customer?.web_url,
    fax_number: customer?.fax_number,
    gst_number: customer?.gst_number,
    pan_number: customer?.pan_number,
    legal_name: customer?.legal_name,
    ecc_number: customer?.ecc_number,
    cst_tin_number: customer?.cst_tin_number,
    gst_tin_number: customer?.gst_tin_number,
    preferable_transport_for_part_load:
      customer?.preferable_transport_for_part_load,
    is_tcs_applicable: customer?.is_tcs_applicable,
    is_tds_applicable: customer?.is_tds_applicable,
    is_turnover_based_tcs_applicable:
      customer?.is_turnover_based_tcs_applicable,
    remark: customer?.remark,
    status: customer?.status,
    contact_person: customer?.contact_person,
    'address.billing_address': customer?.address?.billing_address,
    'address.delivery_address': customer?.address?.delivery_address,
    'address.alternate_delivery_address':
      customer?.address?.alternate_delivery_address,
    'address.communication_address': customer?.address?.communication_address,
    'photo_type.photo_type_a': customer?.photo_type?.photo_type_a,
    'photo_type.photo_type_b': customer?.photo_type?.photo_type_b,
    'photo_type.photo_type_c': customer?.photo_type?.photo_type_c,
    updated_by: authUserDetail?._id,
    is_insurance_applicable: customer?.is_insurance_applicable,
    branding_type: customer?.branding_type,
    credit_schedule: customer?.credit_schedule,
    freight: customer?.freight,
    local_freight: customer?.local_freight,
  };

  const updateCustomerData = await customer_model.updateOne(
    { _id: id },
    {
      $set: customerData,
    }
  );

  if (updateCustomerData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (
    !updateCustomerData.acknowledged ||
    updateCustomerData.modifiedCount <= 0
  ) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Customer Update Successfully',
    updateCustomerData
  );

  return res.status(200).json(response);
});

export const fetchCustomerList = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
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

  // Aggregation stage
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
  const aggTransport = {
    $lookup: {
      from: 'transporters',
      localField: 'preferable_transport_for_part_load',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            name: 1,
            branch: 1,
            transport_id: 1,
            type: 1,
          },
        },
      ],
      as: 'preferable_transport_for_part_load',
    },
  };
  const aggTransportUnwind = {
    $unwind: {
      path: '$preferable_transport_for_part_load',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggSort = {
    $sort: {
      [sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggTransport,
    aggTransportUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const customerData = await customer_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggTransport,
    aggTransportUnwind,
    aggMatch,
    aggCount,
  ]; // total aggregation pipiline

  const totalDocument = await customer_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Customer Data Fetched Successfully', {
    data: customerData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSingleCustomer = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const aggregate = [
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    },
    {
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
    },
    {
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
    },
    {
      $lookup: {
        from: 'transporters',
        localField: 'preferable_transport_for_part_load',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              name: 1,
              branch: 1,
              transport_id: 1,
              type: 1,
            },
          },
        ],
        as: 'preferable_transport_for_part_load',
      },
    },
    {
      $unwind: {
        path: '$preferable_transport_for_part_load',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$created_by',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$updated_by',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'customer_clients',
        localField: '_id',
        foreignField: 'customer_id',
        as: 'customer_clients',
      },
    },
  ];

  const customerData = await customer_model.aggregate(aggregate);

  if (customerData && customerData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Customer Data Fetched Successfully',
    customerData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownCustomer = catchAsync(async (req, res, next) => {
  const customerList = await customer_model.aggregate([
    {
      $match: {
        status: true,
      },
    },
    {
      $project: {
        company_name: 1,
        gst_number: 1,
        pan_number: 1,
        branding_type: 1,
        credit_schedule: 1,
        freight: 1,
        local_freight: 1,
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Customer Dropdown Fetched Successfully',
    customerList
  );
  return res.status(200).json(response);
});
