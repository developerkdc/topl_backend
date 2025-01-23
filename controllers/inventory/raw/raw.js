import catchAsync from '../../../utils/errors/catchAsync.js';
import {
  RawHistoryModel,
  RawMaterialModel,
} from '../../../database/schema/inventory/raw/raw.schema.js';

import XLSX from 'xlsx';
import mongoose from 'mongoose';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import { IssuedForGroupingModel } from '../../../database/schema/group/issueForGrouping/issueForGrouping.schema.js';
import { IssuedForSmokingIndividualModel } from '../../../database/schema/smoking/issuedForSmokingIndividual.js';
import { GroupModel } from '../../../database/schema/group/groupCreated/groupCreated.schema.js';
import SupplierModel from '../../../database/schema/masters/supplier.schema.js';
import NodeCache from 'node-cache';
import { SomethingWrong } from '../../../utils/response/response.js';

const cache = new NodeCache({ stdTTL: 5 });

export const BulkUploadRawMaterial = catchAsync(async (req, res, next) => {
  const file = req.file;
  if (!file || !file.path) {
    return res.status(400).json({
      result: [],
      status: false,
      message: 'No file uploaded or file path not found.',
    });
  }

  const session = await RawMaterialModel.startSession();
  session.startTransaction();

  try {
    const workbook = XLSX.readFile(file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      dateNF: 'dd-mm-yyyy',
      raw: false,
    });

    if (data.length === 0) {
      return res.status(400).json({
        result: [],
        status: false,
        message: 'No items found in the uploaded file.',
      });
    }

    const requiredRawFields = ['date_of_inward', 'invoice_no', 'supplier_id'];
    const requiredrRawItemFields = [
      'item_name',
      'item_code',
      'item_log_no',
      'item_bundle_no',
      'item_length',
      'item_width',
      // "item_received_quantities",
      // "item_received_quantities_natural",
      // "item_received_quantities_dyed",
      // "item_received_quantities_smoked",
      // "item_received_quantities_total",
      'item_received_pattas',
      'item_received_sqm',
      // "item_available_quantities",
      // "item_available_quantities_natural",
      // "item_available_quantities_dyed",
      // "item_available_quantities_smoked",
      // "item_available_quantities_total",
      'item_available_pattas',
      'item_available_sqm',
      'item_pallete_no',
      'item_physical_location',
      'item_grade',
      'item_rate_per_sqm',
    ];

    const supplierIds = new Set(data.map((item) => item.supplier_id));
    const suppliers = await SupplierModel.find({
      _id: { $in: [...supplierIds] },
    }).session(session);

    for (const item of data) {
      for (const field of requiredRawFields) {
        if (!item[field]) {
          return res.status(400).json({
            result: [],
            status: false,
            message: `${field} is required for all items.`,
          });
        }
      }

      for (const field of requiredrRawItemFields) {
        if (item[field] === '') {
          return res.status(400).json({
            result: [],
            status: false,
            message: `${field} is required for all items.`,
          });
        }
      }

      const supplier = suppliers.find((s) => s._id == item.supplier_id);
      if (!supplier) {
        return res.status(400).json({
          result: [],
          status: false,
          message: `Supplier with ID ${item.supplier_id} does not exist.`,
        });
      }
    }

    const authUserDetail = req.userDetails;
    const rawMaterials = data.map((item) => {
      const supplier = suppliers.find((s) => s._id == item.supplier_id);
      return {
        date_of_inward: item?.date_of_inward,
        invoice_no: item?.invoice_no,
        item_name: item?.item_name,
        item_code: item?.item_code,
        item_log_no: item?.item_log_no,
        item_bundle_no: item?.item_bundle_no,
        item_length: item?.item_length,
        item_width: item?.item_width,
        // item_received_quantities: {
        //   natural: item?.item_received_quantities_natural,
        //   dyed: item?.item_received_quantities_dyed,
        //   smoked: item?.item_received_quantities_smoked,
        //   total: item?.item_received_quantities_total,
        // },
        item_received_pattas: item?.item_received_pattas,
        item_received_sqm: item?.item_received_sqm,
        // item_available_quantities: {
        //   natural: item?.item_available_quantities_natural,
        //   dyed: item?.item_available_quantities_dyed,
        //   smoked: item?.item_available_quantities_smoked,
        //   total: item?.item_available_quantities_total,
        // },
        item_available_pattas: item?.item_available_pattas,
        item_available_sqm: item?.item_available_sqm,
        // item_rejected_quantities: {
        //   natural: item?.item_rejected_quantities_natural,
        //   dyed: item?.item_rejected_quantities_dyed,
        //   smoked: item?.item_rejected_quantities_smoked,
        //   total: item?.item_rejected_quantities_total,
        // },
        item_rejected_pattas: item?.item_rejected_pattas,
        item_rejected_sqm: item?.item_rejected_sqm,
        item_pallete_no: item?.item_pallete_no,
        item_physical_location: item?.item_physical_location,
        item_grade: item?.item_grade,
        item_rate_per_sqm: item?.item_rate_per_sqm,
        currency: item?.currency,
        conversion_rate: item?.conversion_rate,
        item_rate_per_sqm_for_currency: item?.item_rate_per_sqm_for_currency,
        item_remark: item?.item_remark,
        supplier_details: {
          supplier_name: supplier?.supplier_name,
          country: supplier?.country,
          state: supplier?.state,
          city: supplier?.city,
          pincode: supplier?.pincode,
          bill_address: supplier?.bill_address,
          delivery_address: supplier?.delivery_address,
          contact_Person_name: supplier?.contact_Person_name,
          contact_Person_number: supplier?.contact_Person_number,
          country_code: supplier?.country_code,
          email_id: supplier?.email_id,
          pan_no: supplier?.pan_no,
          gst_no: supplier?.gst_no,
        },
        created_employee_id: authUserDetail._id,
      };
    });

    const savedRawMaterials = await RawMaterialModel.insertMany(rawMaterials, {
      session,
    });
    const savedHistRawMaterials = await RawHistoryModel.insertMany(
      rawMaterials,
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      result: [],
      status: true,
      message: 'Raw Material Inventory Bulk uploaded successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

export const AddRawVeneer = catchAsync(async (req, res, next) => {
  const authUserDetail = req.userDetails;
  const data = req.body;
  const rawData = data.item_details.map((ele) => {
    return {
      date_of_inward: req.body.date_of_inward,
      supplier_details: req.body.supplier_details,
      invoice_no: req.body.invoice_no,
      created_employee_id: authUserDetail._id,
      currency: req.body.currency,
      ...ele,
    };
  });
  // console.log(rawData);
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    for (const item of rawData) {
      const existingItem = await RawMaterialModel.findOne({
        item_name: item.item_name,
        item_code: item.item_code,
        item_log_no: item.item_log_no,
        item_bundle_no: item.item_bundle_no,
      }).session(session);

      if (existingItem) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: `Item: ${item.item_name}\nItem Type: ${item.item_code}\nLog No: ${item.item_log_no}\nBundle No: ${item.item_bundle_no}\nhas the same details already exists.`,
        });
      }
    }
    const newRaw = await RawMaterialModel.insertMany(rawData, { session });
    const rawHistory = await RawHistoryModel.insertMany(rawData, { session });
    await session.commitTransaction();
    session.endSession();
    return res.json({
      result: newRaw,
      status: true,
      message: 'Raw Material Inventory added successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: 'Error occurred while adding Raw Material Inventory.',
      error: error.message,
    });
  }
});

// export const FetchRawVeneer = catchAsync(async (req, res, next) => {
//   const { string, boolean, numbers } = req?.body?.searchFields || {};
//   const { page, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
//   const skip = Math.max((page - 1) * limit, 0);

//   const search = req.query.search || "";

//   let searchQuery = {};
//   if (search != "" && req?.body?.searchFields) {
//     const searchdata = DynamicSearch(search, boolean, numbers, string);
//     if (searchdata?.length == 0) {
//       return res.status(404).json({
//         statusCode: 404,
//         status: false,
//         data: {
//           data: [],
//         },
//         message: "Results Not Found",
//       });
//     }
//     searchQuery = searchdata;
//   }

//   const { to, from, ...data } = req?.body?.filters || {};
//   const matchQuery = data || {};

//   if (to && from) {
//     matchQuery["date_of_inward"] = {
//       $gte: new Date(from), // Greater than or equal to "from" date
//       $lte: new Date(to), // Less than or equal to "to" date
//     };
//   }

//   const totalDocuments = await RawMaterialModel.countDocuments({
//     ...matchQuery,
//     ...searchQuery,
//   });
//   const totalPages = Math.ceil(totalDocuments / limit);

//   const rawVeneerData = await RawMaterialModel.find({
//     ...matchQuery,
//     ...searchQuery,
//   })
//     .populate({
//       path: "created_employee_id",
//       select: "_id employee_id first_name last_name",
//     })
//     .populate({
//       path: "supplier_details.supplier_name",
//     })
//     .skip(skip)
//     .limit(limit)
//     .sort({ [sortBy]: sort })
//     .exec();

//   return res.status(200).json({
//     result: rawVeneerData,
//     statusCode: 200,
//     status: "success",
//     totalPages: totalPages,
//   });
// });

export const FetchRawVeneer = catchAsync(async (req, res, next) => {
  const cacheKey = req.originalUrl;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = 'updated_at', sort = 'desc' } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

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
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['date_of_inward'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await RawMaterialModel.aggregate(
    [
      {
        $lookup: {
          from: 'users', // Assuming the collection name is "employees"
          localField: 'created_employee_id',
          foreignField: '_id',
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
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $count: 'totalDocuments',
      },
    ],
    { allowDiskUse: true }
  );

  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  const rawVeneerData = await RawMaterialModel.aggregate(
    [
      {
        $lookup: {
          from: 'users', // Assuming the collection name is "employees"
          localField: 'created_employee_id',
          foreignField: '_id',
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
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == 'desc' ? -1 : 1,
          _id: sort == 'desc' ? -1 : 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ],
    { allowDiskUse: true }
  );

  const responseData = {
    result: rawVeneerData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  };

  // Cache the response data with a TTL of 1 minute
  cache.set(cacheKey, responseData, 5); // Cache TTL set to 60 seconds

  return res.status(200).json(responseData);
});

export const rejectRawVeneer = catchAsync(async (req, res, next) => {
  const { id } = req.query;
  const data = req.body;
  const prevData = await RawMaterialModel.findById(id);
  console.log(prevData);
  // const updated_rejected_quantities = {
  //   natural: (
  //     prevData.item_rejected_quantities.natural +
  //     data.item_rejected_quantities.natural
  //   ).toFixed(2),
  //   dyed: (
  //     prevData.item_rejected_quantities.dyed +
  //     data.item_rejected_quantities.dyed
  //   ).toFixed(2),
  //   smoked: (
  //     prevData.item_rejected_quantities.smoked +
  //     data.item_rejected_quantities.smoked
  //   ).toFixed(2),
  //   total: (
  //     prevData.item_rejected_quantities.total +
  //     data.item_rejected_quantities.total
  //   ).toFixed(2),
  // };

  // const updated_available_quantities = {
  //   natural: (
  //     prevData.item_available_quantities.natural -
  //     data.item_rejected_quantities.natural
  //   ).toFixed(2),
  //   dyed: (
  //     prevData.item_available_quantities.dyed -
  //     data.item_rejected_quantities.dyed
  //   ).toFixed(2),
  //   smoked: (
  //     prevData.item_available_quantities.smoked -
  //     data.item_rejected_quantities.smoked
  //   ).toFixed(2),
  //   total: (
  //     prevData.item_available_quantities.total -
  //     data.item_rejected_quantities.total
  //   ).toFixed(2),
  // };

  const item_available_pattas =
    prevData.item_available_pattas - data.item_rejected_pattas;

  const item_rejected_pattas =
    prevData.item_rejected_pattas + data.item_rejected_pattas;

  const calculation =
    (prevData.item_length * prevData.item_width * data.item_rejected_pattas) /
    10000;
  const item_rejected_sqm = parseFloat(
    prevData.item_rejected_sqm + parseFloat(calculation).toFixed(2)
  );

  const item_available_sqm = parseFloat(
    prevData.item_available_sqm - parseFloat(calculation).toFixed(2)
  );

  let status;
  if (item_available_pattas <= 0) {
    status = 'not available';
  }
  console.log(status, 'rrrrrrrr');
  const updateVeneer = await RawMaterialModel.findOneAndUpdate(
    { _id: id }, // Assuming 'id' is the unique identifier field
    {
      $set: {
        // item_rejected_quantities: updated_rejected_quantities,
        item_rejected_pattas: item_rejected_pattas,
        // item_available_quantities: updated_available_quantities,
        item_available_pattas: item_available_pattas,
        item_rejected_sqm: item_rejected_sqm,
        item_available_sqm: item_available_sqm,
        status,
        updated_at: Date.now(),
      },
    },
    { new: true } // This option returns the updated document
  );
  if (!updateVeneer) return next(new ApiError('Veneer Not Found', 404));

  return res.status(200).json({
    statusCode: 200,
    status: true,
    data: updateVeneer,
    message: 'Veneer Updated',
  });
});

export const UpdateRawVeneer = catchAsync(async (req, res, next) => {
  const { id } = req.query;
  const { item_pallete_no, item_physical_location } = req.body;

  // Construct update object based on provided values
  const updateObj = {};
  if (item_pallete_no !== undefined && item_pallete_no !== '') {
    updateObj.item_pallete_no = item_pallete_no;
  }
  if (item_physical_location !== undefined && item_physical_location !== '') {
    updateObj.item_physical_location = item_physical_location;
  }

  // Check if there are any fields to update
  if (Object.keys(updateObj).length === 0) {
    return res.status(400).json({
      statusCode: 400,
      status: false,
      message: 'No fields provided for update.',
    });
  }

  // Find and update the document
  const updatedVeneer = await RawMaterialModel.findOneAndUpdate(
    { _id: id },
    { $set: updateObj },
    { new: true }
  );

  if (!updatedVeneer) {
    return next(new ApiError('Veneer Not Found', 404));
  }

  return res.status(200).json({
    statusCode: 200,
    status: true,
    data: updatedVeneer,
    message: 'Veneer Updated',
  });
});

// export const FetchRawVeneerHistory = catchAsync(async (req, res, next) => {
//   const { string, boolean, numbers } = req?.body?.searchFields || {};
//   const { page, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
//   const skip = Math.max((page - 1) * limit, 0);

//   const search = req.query.search || "";

//   let searchQuery = {};
//   if (search != "" && req?.body?.searchFields) {
//     const searchdata = DynamicSearch(search, boolean, numbers, string);
//     if (searchdata?.length == 0) {
//       return res.status(404).json({
//         statusCode: 404,
//         status: false,
//         data: {
//           data: [],
//         },
//         message: "Results Not Found",
//       });
//     }
//     searchQuery = searchdata;
//   }

//   const { to, from, ...data } = req?.body?.filters || {};
//   const matchQuery = data || {};

//   if (to && from) {
//     matchQuery["date_of_inward"] = {
//       $gte: new Date(from), // Greater than or equal to "from" date
//       $lte: new Date(to), // Less than or equal to "to" date
//     };
//   }

//   const totalDocuments = await RawHistoryModel.countDocuments({
//     ...matchQuery,
//     ...searchQuery,
//   });
//   const totalPages = Math.ceil(totalDocuments / limit);

//   const rawVeneerData = await RawHistoryModel.find({
//     ...matchQuery,
//     ...searchQuery,
//   })
//     .populate({
//       path: "created_employee_id",
//       select: "_id employee_id first_name last_name",
//     })
//     .sort({ [sortBy]: sort })
//     .skip(skip)
//     .limit(limit)
//     .exec();

//   return res.status(200).json({
//     result: rawVeneerData,
//     statusCode: 200,
//     status: "success",
//     totalPages: totalPages,
//   });
// });

export const FetchRawVeneerHistory = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = 'updated_at', sort = 'desc' } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

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
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['date_of_inward'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await RawHistoryModel.aggregate([
    {
      $lookup: {
        from: 'users', // Assuming the collection name is "employees"
        localField: 'created_employee_id',
        foreignField: '_id',
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
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $count: 'totalDocuments',
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  const rawVeneerData = await RawHistoryModel.aggregate([
    {
      $lookup: {
        from: 'users', // Assuming the collection name is "employees"
        localField: 'created_employee_id',
        foreignField: '_id',
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
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return res.status(200).json({
    result: rawVeneerData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const IssueForGrouping = catchAsync(async (req, res, next) => {
  const authUserDetail = req.userDetails;
  const data = req.body;
  const rawData = data?.item_details?.map((ele) => {
    return {
      item_id: ele, // Corrected this line
      created_employee_id: authUserDetail._id,
    };
  });
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if any item is already issued for grouping
    const existingGrouping = await IssuedForGroupingModel.findOne({
      item_id: { $in: data.item_details },
    }).session(session);

    if (existingGrouping) {
      return res.json({
        status: false,
        message: 'One or more items are already issued for grouping.',
      });
    }

    // Insert new entries for grouping
    const grouping = await IssuedForGroupingModel.insertMany(rawData, {
      session,
    });

    // Update status field in RawMaterialModel for the provided IDs
    await RawMaterialModel.updateMany(
      { _id: { $in: data.item_details } }, // Update documents with IDs in item_details array
      { $set: { status: 'issued for grouping' } }, // Set the status field to "issued for grouping"
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      result: grouping,
      status: true,
      message: 'Issued for grouping successful.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

export const CancelGrouping = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Check if the ID exists in IssueForGroupingModel
    const issueRecord = await IssuedForGroupingModel.findOne({
      item_id: id,
    }).session(session);

    if (issueRecord) {
      // If the record exists in IssueForGroupingModel, remove it
      await IssuedForGroupingModel.deleteOne({ item_id: id }).session(session);

      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await RawMaterialModel.updateOne(
        { _id: issueRecord.item_id },
        { $set: { status: 'available' } }
      ).session(session);
    } else {
      // If the record does not exist in IssueForGroupingModel, return error
      return res.json({
        status: false,
        message: 'Record not found in Issued For Grouping.',
      });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: 'Cancellation successful.',
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: 'Error occurred while cancelling grouping.',
      error: error.message,
    });
  }
});

export const IssueForSmokingRaw = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction

  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const data = req.body;
    console.log(data, 'data');
    const issuedForSmokingIds = [...data.item_details];

    // Find raw materials that are not already issued for smoking
    const rawMaterials = await RawMaterialModel.find(
      {
        _id: { $in: issuedForSmokingIds },
        status: { $ne: 'issued for smoking' },
      },
      {
        item_available_pattas: 1,
      }
    ).session(session);

    // Create documents for issued items
    const issuedItems = rawMaterials.map((e) => ({
      item_id: e._id,
      issued_smoking_quantity: e.item_available_pattas,
      created_employee_id: authUserDetail._id,
    }));

    // Insert issued items into the IssuedForSmokingIndividualModel
    await IssuedForSmokingIndividualModel.insertMany(issuedItems, { session });

    // Update status of raw materials to "issued for smoking"
    await RawMaterialModel.updateMany(
      {
        _id: { $in: issuedForSmokingIds },
      },
      {
        $set: {
          status: 'issued for smoking',
        },
      }
    ).session(session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: 'Issue for smoking successful',
    });
  } catch (error) {
    // Rollback the transaction if there is any error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: error.message });
  }
});

export const IssueForSmokingRawPattas = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction

  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const item_id = req.body.item_id;
    const data = { ...req.body, created_employee_id: authUserDetail._id };

    const isIssued = await RawMaterialModel.findById(req.body.item_id);
    console.log(isIssued);
    if (isIssued.status == 'issued for smoking') {
      // Rollback the transaction if the material is already issued for smoking
      await session.abortTransaction();
      session.endSession();
      return res.json({
        status: false,
        message: 'Issue for smoking failed',
      });
    }

    const newData = new IssuedForSmokingIndividualModel(data);
    const savedIssuedForSmoking = await newData.save({ session });

    await RawMaterialModel.findByIdAndUpdate(
      {
        _id: item_id,
      },
      {
        $set: {
          status: 'issued for smoking',
        },
      },
      { session }
    );

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: 'Issue for smoking successful',
      result: savedIssuedForSmoking,
    });
  } catch (error) {
    // Rollback the transaction if there is any error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: error.message });
  }
});

export const CancelSmokingRaw = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Check if the ID exists in IssuedForSmokingIndividualModel
    const issueRecord = await IssuedForSmokingIndividualModel.findOne({
      item_id: id,
    }).session(session);

    if (issueRecord) {
      // If the record exists in IssuedForSmokingIndividualModel, remove it
      await IssuedForSmokingIndividualModel.deleteOne({ item_id: id }).session(
        session
      );

      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await RawMaterialModel.updateOne(
        { _id: issueRecord.item_id },
        { $set: { status: 'available' } }
      ).session(session);
    } else {
      // If the record does not exist in IssuedForSmokingIndividualModel, return error
      return res.json({
        status: false,
        message: 'Record not found in Issued For Smoking.',
      });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: 'Cancellation successful.',
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: 'Error occurred while cancelling smoking.',
      error: error.message,
    });
  }
});

export const IssuedForSmokingRawList = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = 'updated_at', sort = 'desc' } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

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
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['created_at'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await IssuedForSmokingIndividualModel.aggregate([
    {
      $lookup: {
        from: 'raw_materials',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item_id',
      },
    },
    {
      $unwind: {
        path: '$item_id',
        preserveNullAndEmptyArrays: true,
      },
    },
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
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $count: 'totalDocuments',
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  // const rawVeneerData = await IssuedForSmokingIndividualModel.find({
  //   ...matchQuery,
  //   ...searchQuery,
  // })
  //   .populate({
  //     path: "created_employee_id",
  //     select: "_id employee_id first_name last_name",
  //   })
  //   .populate("item_id")
  //   .skip(skip)
  //   .limit(limit)
  //   .sort({ [sortBy]: sort })
  //   .exec();

  const rawVeneerData = await IssuedForSmokingIndividualModel.aggregate([
    {
      $lookup: {
        from: 'raw_materials',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item_id',
      },
    },
    {
      $unwind: {
        path: '$item_id',
        preserveNullAndEmptyArrays: true,
      },
    },
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
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return res.status(200).json({
    result: rawVeneerData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

//This api is used for group editing
export const rejectRawVeneerMultiple = catchAsync(async (req, res, next) => {
  const dataArray = req.body.item_details; // Assuming dataArray is an array of data objects
  const session = await RawMaterialModel.startSession();
  // Iterate over each data object in the array
  try {
    await session.withTransaction(async () => {
      for (let data of dataArray) {
        const prevData = await RawMaterialModel.findById(data._id);

        // const updated_rejected_quantities = {
        //   natural: (
        //     prevData.item_rejected_quantities.natural +
        //     data.item_rejected_quantities.natural
        //   ).toFixed(2),
        //   dyed: (
        //     prevData.item_rejected_quantities.dyed +
        //     data.item_rejected_quantities.dyed
        //   ).toFixed(2),
        //   smoked: (
        //     prevData.item_rejected_quantities.smoked +
        //     data.item_rejected_quantities.smoked
        //   ).toFixed(2),
        //   total: (
        //     prevData.item_rejected_quantities.total +
        //     data.item_rejected_quantities.total
        //   ).toFixed(2),
        // };

        // const updated_available_quantities = {
        //   natural: (
        //     prevData.item_available_quantities.natural -
        //     data.item_rejected_quantities.natural
        //   ).toFixed(2),
        //   dyed: (
        //     prevData.item_available_quantities.dyed -
        //     data.item_rejected_quantities.dyed
        //   ).toFixed(2),
        //   smoked: (
        //     prevData.item_available_quantities.smoked -
        //     data.item_rejected_quantities.smoked
        //   ).toFixed(2),
        //   total: (
        //     prevData.item_available_quantities.total -
        //     data.item_rejected_quantities.total
        //   ).toFixed(2),
        // };

        // const item_available_pattas =
        //   prevData.item_available_pattas - data.item_rejected_quantities.total;
        const item_available_pattas =
          prevData.item_available_pattas - data.item_rejected_pattas;

        const item_rejected_pattas =
          prevData.item_rejected_pattas + data.item_rejected_pattas;

        // const item_rejected_pattas =
        //   prevData.item_rejected_pattas + data.item_rejected_quantities.total;

        const calculation =
          (prevData.item_length *
            prevData.item_width *
            data.item_rejected_pattas) /
          10000;

        // const item_rejected_sqm = parseFloat(
        //   prevData.item_rejected_sqm + parseFloat(calculation).toFixed(2)
        // );
        // console.log(item_rejected_sqm, "item_rejected_sqm");

        const item_rejected_sqm = parseFloat(
          (prevData.item_rejected_sqm + calculation).toFixed(2)
        );

        const item_available_sqm = parseFloat(
          (prevData.item_available_sqm - calculation).toFixed(2)
        );
        // const item_available_sqm = parseFloat(
        //   parseFloat(prevData.item_available_sqm).toFixed(2) -
        //     parseFloat(calculation).toFixed(2)
        // );

        // throw new Error("testing");
        if (
          item_available_pattas < 0 ||
          item_rejected_pattas < 0 ||
          item_rejected_sqm < 0 ||
          item_available_sqm < 0
        ) {
          await session.abortTransaction();
          session.endSession();
          return next(new ApiError('Veneer Not Updated, Check Data', 400));
        }

        const updateVeneer = await RawMaterialModel.findOneAndUpdate(
          { _id: data._id }, // Assuming 'id' is the unique identifier field
          {
            $set: {
              // item_rejected_quantities: updated_rejected_quantities,
              item_rejected_pattas: item_rejected_pattas,
              // item_available_quantities: updated_available_quantities,
              item_available_pattas: item_available_pattas,
              item_rejected_sqm: item_rejected_sqm,
              item_available_sqm: item_available_sqm,
              updated_at: Date.now(),
            },
          },
          { new: true } // This option returns the updated document
        ).session(session);
        if (!updateVeneer) {
          await session.abortTransaction();
          session.endSession();
          return next(new ApiError('Veneer Not Found', 404));
        }
      }
      const { item_details, ...groupdata } = req.body;
      console.log(groupdata, 'rgrfgfdgfyudf');
      let status = 'available';
      if (groupdata.group_no_of_pattas_available == 0) {
        status = 'not available';
      }
      const updatedGroupData = await GroupModel.findOneAndUpdate(
        { _id: req.body._id },
        {
          $set: {
            total_item_sqm_original: groupdata.total_item_sqm_original,
            group_no_of_pattas_original: groupdata.group_no_of_pattas_original,
            group_no_of_pattas_available:
              groupdata.group_no_of_pattas_available,
            total_item_sqm_available: groupdata.total_item_sqm_available,
            status: status,
          },
        },
        { new: true }
      ).session(session);
      await session.commitTransaction();
    });
    session.endSession();
    return res.status(200).json({
      statusCode: 200,
      status: true,
      message: 'Veneer Updated',
    });
  } catch (error) {
    // Handle errors
    console.error('Transaction aborted due to an error:', error);
    // End the session in case of an error
    session.endSession();
    return next(new ApiError('Transaction Failed', 500));
  }
});

export const UpdateRawVeneerData = catchAsync(async (req, res, next) => {
  const { id } = req.query;
  const updateObj = req.body;
  console.log(updateObj, 'updateObj');

  const existingItem = await RawMaterialModel.findOne({
    item_name: updateObj.item_details.item_name,
    item_code: updateObj.item_details.item_code,
    item_log_no: updateObj.item_details.item_log_no,
    item_bundle_no: updateObj.item_details.item_bundle_no,
    _id: { $ne: updateObj._id },
  });

  if (existingItem) {
    return res.status(400).json({
      status: false,
      message: `Item: ${updateObj.item_details.item_name}\nItem Type: ${updateObj.item_details.item_code}\nLog No: ${updateObj.item_details.item_log_no}\nBundle No: ${updateObj.item_details.item_bundle_no}\nhas the same details already exists.`,
    });
  }

  const requiredFields = ['date_of_inward', 'invoice_no'];

  // Validate required fields
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({
        result: [],
        status: false,
        message: `${field} is required.`,
      });
    }
  }

  function validateItem(item, requiredFields) {
    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === '') {
        return {
          isValid: false,
          message: `${field} is required.`,
        };
      }
    }
    return { isValid: true };
  }
  const requiredFieldsItem = [
    'item_name',
    'item_code',
    'item_log_no',
    'item_bundle_no',
    'item_length',
    'item_width',
    'item_pallete_no',
    'item_physical_location',
    'item_grade',
    'item_rate_per_sqm',
  ];

  const itemValidation = validateItem(
    req.body.item_details,
    requiredFieldsItem
  );
  if (!itemValidation.isValid) {
    return res.status(400).json({
      result: [],
      status: false,
      message: itemValidation.message,
    });
  }

  const modified = {
    ...updateObj,
    ...updateObj.item_details,
  };

  const updatedVeneer = await RawMaterialModel.findOneAndUpdate(
    { _id: id },
    { $set: modified },
    { new: true }
  );
  if (!updatedVeneer) {
    return next(new ApiError('Veneer Not Found', 404));
  }
  console.log(updatedVeneer, 'updatedVeneer');
  return res.status(200).json({
    statusCode: 200,
    status: true,
    data: updatedVeneer,
    message: 'Veneer Updated',
  });
});

export const DeleteRawVeneer = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.query;
    const deletedVeneer =
      await RawMaterialModel.findByIdAndDelete(id).session(session);
    if (!deletedVeneer) {
      await session.abortTransaction();
      session.endSession();
      return next(new ApiError('Veneer Not Found', 404));
    }
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      statusCode: 200,
      status: true,
      data: [],
      message: 'Veneer Deleted Successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: 'Error occurred while deleteing Raw Material Inventory.',
      error: error.message,
    });
  }
});

export const IssuedForDyingRawList = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = 'updated_at', sort = 'desc' } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(search, boolean, numbers, string);
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['created_at'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await IssuedForDyingIndividualModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const rawVeneerData = await IssuedForDyingIndividualModel.aggregate([
    {
      $lookup: {
        from: 'raw_materials',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item_id',
      },
    },
    {
      $unwind: {
        path: '$item_id',
        preserveNullAndEmptyArrays: true,
      },
    },
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
      $match: {
        ...matchQuery,
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return res.status(200).json({
    result: rawVeneerData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const RawTotalSqmList = catchAsync(async (req, res, next) => {
  const totalSqm = await RawMaterialModel.aggregate([
    {
      $group: {
        _id: null,
        totalSqm: { $sum: '$item_available_sqm' },
      },
    },
  ]);

  // If you want the result as a single value without "_id"
  let totalSqmValue = totalSqm.length > 0 ? totalSqm[0].totalSqm : 0;
  totalSqmValue = totalSqmValue.toFixed(2);
  res
    .status(200)
    .json({ totalSqm: totalSqmValue, statusCode: 200, status: 'success' });
});

export const RawItemBundleNoExist = catchAsync(async (req, res) => {
  const { item_name, item_code, item_log_no, item_bundle_no } = req.body;
  console.log(req.body, 'req.body');

  const rawItems = await RawMaterialModel.aggregate([
    {
      $match: {
        item_name: item_name,
        item_code: item_code,
        item_log_no: item_log_no,
        item_bundle_no: item_bundle_no,
      },
    },
  ]);
  console.log(rawItems, 'rawItems');
  if (!rawItems.length) {
    res.status(200).json({
      statusCode: 200,
      status: true,
      data: [],
      message: 'Items do not exist',
    });
  } else {
    res.status(400).json({
      statusCode: 400,
      status: false,
      data: [],
      message: 'Items exist',
    });
  }
});
