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
import { StatusCodes } from '../../../utils/constants.js';
import axios from 'axios';
import { EInvoiceHeaderVariable } from '../../../middlewares/eInvoiceAuth.middleware.js';

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
        supplier_type: 1,
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

export const verify_customer_gstin = catchAsync(async (req, res, next) => {
  const { param1 } = req.body;
  const authToken = req.eInvoiceAuthToken;

  const irnResponse = await axios.get(
    `${process.env.E_INVOICE_BASE_URL}/einvoice/type/GSTNDETAILS/version/V1_03?email=${process.env.E_INVOICE_EMAIL_ID}&param1=${param1}`,
    {
      headers: {
        ...EInvoiceHeaderVariable,
        'auth-token': authToken,
        'Content-Type': 'application/json',
      },
    }
  );
  if (irnResponse?.data?.status_cd === '1') {
    return res.status(200).json({
      success: true,
      message: 'Customer GSTIN Verified Successfully',
      result: irnResponse?.data?.data,
    });
  }else{
    // Try to parse the error response and extract the first error object from status_desc array
    let errorMessage = "Customer GSTIN Verification Failed.";
    try {
      if (irnResponse?.data?.status_desc) {
        const statusDescArr = JSON.parse(irnResponse.data.status_desc);
        if (Array.isArray(statusDescArr) && statusDescArr.length > 0) {
          errorMessage = statusDescArr[0]?.ErrorMessage || errorMessage;
        }
      }
    } catch (parseErr) {
      errorMessage = "An unknown error occurred.";
    }
    throw new ApiError(errorMessage, StatusCodes.BAD_REQUEST);
  }
})

//mobile API's

export const fetch_single_customer_by_id = catchAsync(async (req, res, next) => {
  const { CustomerId } = req.body;

  if (!CustomerId) {
    throw new ApiError("Customer Id is required", StatusCodes.BAD_REQUEST);
  }

  if (!mongoose.isValidObjectId(CustomerId)) {
    throw new ApiError("Invalid Customer Id", StatusCodes.BAD_REQUEST);
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

  const list_aggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind
  ]
  const pipeline = [
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(CustomerId)
      }
    },
    ...list_aggregate
  ]
  const [customerData] = await customer_model.aggregate(pipeline);

  if (!customerData) {
    throw new ApiError("Customer not found", StatusCodes.NOT_FOUND);
  }
  // const updated_payload = {
  //   bi_CustomerId: customerData.sr_no || null,
  //   vc_CustomerName: customerData.company_name || null,
  //   d_BirthDate: customerData.dob || null,
  //   vc_OwnerName: customerData.owner_name || null,
  //   vc_EmailId: customerData.email_id || null,
  //   vc_WebUrl: customerData.web_url || null,
  //   vc_GSTNo: customerData.gst_number || null,
  //   vc_CSTNo: customerData.pan_number || null,

  //   vc_BillingAddressLine1: customerData.address?.billing_address?.address || null,
  //   vc_BillingAddressLine2: customerData.address?.billing_address?.address_line_2 || null,
  //   bi_BillingCityId: customerData.address?.billing_address?.city || null,
  //   i_BillingStateId: customerData.address?.billing_address?.state || null,
  //   i_BillingCountryId: customerData.address?.billing_address?.country || null,
  //   vc_BillingPinCode: customerData.address?.billing_address?.pincode || null,

  //   vc_DeliveryAddressLine1: customerData.address?.delivery_address?.address || null,
  //   vc_DeliveryAddressLine2: customerData.address?.delivery_address?.address_line_2 || null,
  //   bi_DeliveryCityId: customerData.address?.delivery_address?.city || null,
  //   i_DeliveryStateId: customerData.address?.delivery_address?.state || null,
  //   i_DeliveryCountryId: customerData.address?.delivery_address?.country || null,
  //   vc_DeliveryPinCode: customerData.address?.delivery_address?.pincode || null,

  //   b_IsCForm: customerData.is_tcs_applicable ? "1" : "0",
  //   b_IsTaxInvoice: customerData.is_tcs_applicable ? "1" : "0",
  //   vc_SaleType: customerData.supplier_type || null,
  //   f_Freight: customerData.freight ?? null,
  //   b_Status: customerData.status ? "1" : "0",

  //   i_CreditPeriodDays: customerData.credit_schedule || null,

  //   PhotoTypeA: customerData.photo_type?.photo_type_a || null,
  //   PhotoTypeB: customerData.photo_type?.photo_type_b || null,
  //   PhotoTypeC: customerData.photo_type?.photo_type_c || null,

  //   vc_Remark: customerData.remark || null,
  //   d_CreatedOn: customerData.createdAt,
  //   bi_CreatedBy: customerData.created_by?.user_name || null,
  //   d_ModifiedOn: customerData.updatedAt || null,
  //   bi_ModifiedBy: customerData.updated_by?.user_name || null,
  //   ToSync: "1",
  //   GSTNoFromJuly2017: customerData.gst_number || null,
  // };

  const updated_payload = {
    bi_CustomerId: customerData?.sr_no ?? null,
    vc_CustomerName: customerData?.company_name ?? null,
    d_BirthDate: customerData?.dob ?? null,
    vc_OwnerName: customerData?.owner_name ?? null,
    bi_ParentCustomerId: null,
    i_GroupId: null,
    vc_Phone1: customerData?.phone_number ?? null,
    vc_Phone2: customerData?.alternate_phone_number ?? null,
    vc_MobileNo1: customerData?.contact_person?.[0]?.mobile_no ?? null,
    vc_MobileNo2: customerData?.contact_person?.[1]?.mobile_no ?? null,
    vc_EmailId: customerData?.email_id ?? null,
    vc_FaxNo: null,
    vc_WebUrl: customerData?.web_url ?? null,
    vc_ECCNo: null,
    vc_CSTNo: customerData?.pan_number ?? null,
    vc_GSTNo: customerData?.gst_number ?? null,

    vc_BillingAddressLine1: customerData?.address?.billing_address?.address ?? null,
    vc_BillingAddressLine2: customerData?.address?.billing_address?.address_line_2 ?? null,
    bi_BillingCityId: customerData?.address?.billing_address?.city ?? null,
    vc_BillingOtherCity: null,
    i_BillingStateId: customerData?.address?.billing_address?.state ?? null,
    i_BillingCountryId: customerData?.address?.billing_address?.country ?? null,
    vc_BillingPinCode: customerData?.address?.billing_address?.pincode ?? null,

    vc_DeliveryAddressLine1: customerData?.address?.delivery_address?.address ?? null,
    vc_DeliveryAddressLine2: customerData?.address?.alternate_delivery_address?.address ?? null,
    bi_DeliveryCityId: customerData?.address?.delivery_address?.city ?? null,
    vc_DeliveryOtherCity: null,
    i_DeliveryStateId: customerData?.address?.delivery_address?.state ?? null,
    i_DeliveryCountryId: customerData?.address?.delivery_address?.country ?? null,
    vc_DeliveryPinCode: customerData?.address?.delivery_address?.pincode ?? null,

    b_IsCForm: customerData?.is_tcs_applicable ? "1" : "0",
    f_Freight: customerData?.freight ?? null,
    vc_ApplicableTax: null,
    vc_PTForFullLoad: customerData?.preferable_transport_for_full_load?.transport_name ?? null,
    vc_PTForPartLoad: customerData?.preferable_transport_for_part_load?.transport_name ?? null,
    b_IsWBandDEPRequired: "0",
    vc_DEPName: null,
    vc_DEPPhone: null,
    vc_DEPMobileNo: null,
    vc_DEPEmailId: null,
    vc_DEPFaxNo: null,
    vc_ACName: null,
    vc_ACPhone: null,
    vc_ACMobileNo: null,
    vc_ACEmailId: null,
    vc_ACFaxNo: null,
    vc_PURName: null,
    vc_PURPhone: null,
    vc_PURMobileNo: null,
    vc_PUREmailId: null,
    vc_PURFaxNo: null,

    b_Status: customerData?.status ? "1" : "0",
    d_CreatedOn: customerData?.createdAt ?? null,
    bi_CreatedBy: customerData?.created_by?.user_name ?? null,
    d_ModifiedOn: customerData?.updatedAt ?? null,
    bi_ModifiedBy: customerData?.updated_by?.user_name ?? null,
    vc_Remark: customerData?.remark ?? null,
    b_IsTaxInvoice: customerData?.is_tcs_applicable ? "1" : "0",
    vc_SaleType: customerData?.supplier_type ?? null,
    i_CreditPeriodDays: customerData?.credit_schedule ?? null,
    ToSync: "1",
    PhotoTypeA: customerData?.photo_type?.photo_type_a ?? null,
    PhotoTypeB: customerData?.photo_type?.photo_type_b ?? null,
    PhotoTypeC: customerData?.photo_type?.photo_type_c ?? null,
    GSTNoFromJuly2017: customerData?.gst_number ?? null,
  };
  return res.status(StatusCodes.OK).json(updated_payload);
});

