import {
  extractDataFromMDBFile,
  StatusCodes,
} from '../../../../utils/constants.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import ApiError from '../../../../utils/errors/apiError.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import { issue_for_dressing_model } from '../../../../database/schema/factory/slicing/slicing_done.schema.js';
// import {
//   dressing_bulk_upload_queue,
//   dressing_bulk_upload_queue_events,
// } from '../../../../utils/bullMyWorkers/bulk.upload.worker.js';
import dressing_raw_machine_data_model from '../../../../database/schema/factory/dressing/dressing_done/dressing.machine.raw.data.schema.js';
import mongoose, { isValidObjectId } from 'mongoose';
import {
  delete_session,
  get_session,
  save_session,
} from '../../../../utils/mongo_session_store.js';
import dressing_miss_match_data_model from '../../../../database/schema/factory/dressing/dressing_done/dressing.machine.mismatch.data.schema.js';
import { dressing_error_types } from '../../../../database/Utils/constants/constants.js';

export const list_issue_for_dressing = catchAsync(async (req, res) => {
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
  } = req.body.searchFields || {};

  const { filter } = req.body;
  let search_query = {};

  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );

    if (search_data?.length === 0) {
      throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const matchQuery = {
    ...search_query,
    ...filterData,
  };

  const aggMatch = {
    $match: {
      ...matchQuery,
      is_dressing_done: false,
    },
  };

  const aggSort = {
    $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
  };

  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };

  const aggLimit = {
    $limit: parseInt(limit),
  };

  const all_aggregates = [aggMatch, aggSort, aggSkip, aggLimit];

  const list_issue_for_dressing =
    await issue_for_dressing_model.aggregate(all_aggregates);

  const aggCount = {
    $count: 'totalCount',
  };

  const aggCountTotalDocs = [aggMatch, aggCount];

  const total_docs =
    await issue_for_dressing_model.aggregate(aggCountTotalDocs);

  const totalPages = Math.ceil(
    (total_docs?.[0]?.totalCount || 0) / parseInt(limit)
  );

  const response = new ApiResponse(
    StatusCodes.OK,
    'Issue for Dressing List Fetched Successfully',
    { data: list_issue_for_dressing, totalPages: totalPages }
  );

  return res.status(StatusCodes.OK).json(response);
});

export const fetch_single_issue_of_dressing_item = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }

    const result = await issue_for_dressing_model.findById(id);

    if (!result) {
      throw new ApiError('No Data Found', StatusCodes.NOT_FOUND);
    }

    const response = new ApiResponse(
      StatusCodes.OK,
      'Data fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

// export const bulk_upload_machine_raw_data = catchAsync(async (req, res, next) => {
//   const file = req.file;
//   const { _id } = req.userDetails;
//   const batch_size = 500;
//   let job_promises = []
//   try {
//     if (!file) {
//       throw new ApiError("File is missing", StatusCodes.NOT_FOUND)
//     };

//     const workbook = xlsx.readFile(file?.path);
//     const items = workbook.Sheets[workbook.SheetNames[0]];

//     const dressing_items = xlsx.utils.sheet_to_json(items);

//     if (dressing_items?.length === 0) {
//       throw new ApiError("No Items Found", StatusCodes.NOT_FOUND)
//     };

//     //formatting date
//     const formatted_items_dates = dressing_items?.map((item) => {
//       const jsDate = new Date((item?.Fecha - 25569) * 86400 * 1000)
//       console.log("date => ", jsDate)
//       return {
//         ...item,
//         DressingDate: jsDate?.toISOString()?.split("T")[0]
//       }
//     });

//     //extract unique dates
//     const unique_dressing_date_set = [...new Set(formatted_items_dates?.map((item) => item?.DressingDate))];

//     //extract sr_no
//     const existingMaxSrNo = await dressing_raw_machine_data_model?.aggregate([{ $match: { DressingDate: { $in: unique_dressing_date_set } } }, { $group: { _id: "DressDate", max_sr_no: { $max: "$ItemSrNo" } } }]);

//     //create a new map for holding sr_no with date
//     const sr_no_map = new Map();

//     existingMaxSrNo?.forEach((item) => {
//       sr_no_map?.set(item?._id, item?.max_sr_no)
//     });

//     const updated_dressing_items = formatted_items_dates?.map((item) => {
//       const dateKey = item?.DressingDate;
//       const current_sr_no = sr_no_map?.get(dateKey) || 0;
//       sr_no_map?.set(dateKey, current_sr_no + 1)
//       return { ...item, ItemSrNo: sr_no_map?.get(dateKey), created_by: _id, updated_by: _id }
//     })
//     console.log(sr_no_map)
//     for (let i = 0; i < updated_dressing_items?.length; i += batch_size) {
//       const batch = updated_dressing_items?.slice(i, i + batch_size);
//       const job = await dressing_bulk_upload_queue?.add('bulk_upload_job', { data: batch });

//       job_promises?.push(job?.waitUntilFinished(dressing_bulk_upload_queue_events))
//     };
//     await Promise.all(job_promises);

//     const response = new ApiResponse(StatusCodes?.OK, "Bulk Upload Processing Started");

//     return res.status(StatusCodes.OK).json(response)

//   } catch (error) {

//     next(error)
//   }
// })

export const bulk_upload_machine_raw_data = catchAsync(
  async (req, res, next) => {
    const file = req.file;
    const { _id } = req.userDetails;
    const batch_size = 1000;
    let job_promises = [];
    const tableName = 'paquetes';
    const session = await mongoose?.startSession();
    const session_id = new mongoose.Types.ObjectId()?.toString();
    save_session(session_id, session);

    try {
      await session?.startTransaction();
      console.log('✅ Transaction Started');
      if (!file) {
        throw new ApiError('File is missing', StatusCodes.NOT_FOUND);
      }
      console.log('path => ', file?.path);
      const dressing_items = extractDataFromMDBFile(file?.path, tableName);

      if (dressing_items?.length === 0) {
        throw new ApiError('No Items Found', StatusCodes.NOT_FOUND);
      }

      //formatting date
      const formatted_items_dates = dressing_items?.map((item) => {
        // const jsDate = new Date((item?.Fecha - 25569) * 86400 * 1000)
        const jsDate = new Date(item?.Fecha)?.toISOString()?.split('T')?.[0];
        return {
          ...item,
          DressingDate: jsDate,
        };
      });

      //extract unique dates
      const unique_dressing_date_set = [
        ...new Set(formatted_items_dates?.map((item) => item?.DressingDate)),
      ];

      //extract sr_no
      const existingMaxSrNo = await dressing_raw_machine_data_model?.aggregate([
        { $match: { DressingDate: { $in: unique_dressing_date_set } } },
        { $group: { _id: 'DressingDate', max_sr_no: { $max: '$ItemSrNo' } } },
      ]);

      //creating a new map for holding sr_no with date
      const sr_no_map = new Map();

      existingMaxSrNo?.forEach((item) => {
        sr_no_map?.set(item?._id, item?.max_sr_no);
      });

      const updated_dressing_items = formatted_items_dates?.map((item) => {
        const dateKey = item?.DressingDate;
        const current_sr_no = sr_no_map?.get(dateKey) || 0;
        sr_no_map?.set(dateKey, current_sr_no + 1);
        return {
          ...item,
          ItemSrNo: sr_no_map?.get(dateKey),
          created_by: _id,
          updated_by: _id,
        };
      });
      const batch_duplicates = new Set();

      const hasDuplicate = updated_dressing_items?.some((item) => {
        const key = `${item.Tronco}-${item.Partida}-${item.NumPaqTronco}`;
        if (batch_duplicates?.has(key)) {
          return true;
        }
        batch_duplicates.add(key);
        return false;
      });
      console.log('batch duplicate => ', batch_duplicates);
      if (hasDuplicate) {
        throw new ApiError(
          'Duplicate found within uploaded file. Ensure each (Log No. Code + Pallet Number) has a unique Bundle Number.',
          StatusCodes.BAD_REQUEST
        );
      }

      for (let i = 0; i < updated_dressing_items?.length; i += batch_size) {
        const batch = updated_dressing_items?.slice(i, i + batch_size);

        const job = await dressing_bulk_upload_queue?.add('bulk_upload_queue', {
          data: batch,
        });

        job_promises?.push(
          job?.waitUntilFinished(dressing_bulk_upload_queue_events)
        );
        // await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await Promise.all(job_promises);
      await session?.commitTransaction();
      console.log('✅ Transaction Commited');
      console.log('✅ All jobs completed successfully. Committing session.');
      delete_session(session_id);

      const response = new ApiResponse(
        StatusCodes?.OK,
        'Bulk Upload Processing Started'
      );
      return res.status(StatusCodes.OK).json(response);
    } catch (error) {
      await session.abortTransaction();
      console.log('✅ Transaction Aborted');
      delete_session(session_id);
      throw error;
    } finally {
      await session?.endSession();
      console.log('✅ Transaction Ended');
    }
  }
);

export const bulk_upload_machine_raw_data_new = async (req, res, next) => {
  const file = req.file;
  const { _id } = req.userDetails;
  const batch_size = 1000;

  if (!file) {
    return next(new ApiError('File is missing', StatusCodes.NOT_FOUND));
  }

  const tableName = 'paquetes';
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('✅ Transaction Started');
    const dressing_items = extractDataFromMDBFile(file.path, tableName);

    if (!dressing_items.length) {
      throw new ApiError('No Items Found', StatusCodes.NOT_FOUND);
    }

    //formatting date
    const formatted_items_dates = dressing_items?.map((item) => {
      // const jsDate = new Date((item?.Fecha - 25569) * 86400 * 1000)
      const jsDate = new Date(item?.Fecha)?.toISOString()?.split('T')?.[0];
      return {
        ...item,
        DressingDate: jsDate,
      };
    });

    //extract unique dates
    const unique_dressing_date_set = [
      ...new Set(formatted_items_dates?.map((item) => item?.DressingDate)),
    ];

    //extract sr_no
    const existingMaxSrNo = await dressing_raw_machine_data_model?.aggregate([
      { $match: { DressingDate: { $in: unique_dressing_date_set } } },
      { $group: { _id: 'DressingDate', max_sr_no: { $max: '$ItemSrNo' } } },
    ]);

    //creating a new map for holding sr_no with date
    const sr_no_map = new Map();

    existingMaxSrNo?.forEach((item) => {
      sr_no_map?.set(item?._id, item?.max_sr_no);
    });

    const updated_dressing_items = formatted_items_dates?.map((item) => {
      const dateKey = item?.DressingDate;
      const current_sr_no = sr_no_map?.get(dateKey) || 0;
      sr_no_map?.set(dateKey, current_sr_no + 1);
      return {
        ...item,
        ItemSrNo: sr_no_map?.get(dateKey),
        created_by: _id,
        updated_by: _id,
      };
    });

    for (let i = 0; i < updated_dressing_items?.length; i += batch_size) {
      const batch = updated_dressing_items.slice(i, i + batch_size);
      console.log(
        `Processing batch ${i / batch_size + 1}: ${batch.length} records`
      );

      const duplicateCheck = await dressing_raw_machine_data_model
        .find({
          $or: batch?.map((item) => ({
            Tronco: item?.Tronco,
            Partida: item?.Partida,
            NumPaqTronco: item?.NumPaqTronco,
          })),
        })
        .lean();

      if (duplicateCheck?.length > 0) {
        const duplicateDetails = duplicateCheck
          .map(
            (dup) =>
              `Tronco: ${dup?.Tronco}, Partida: ${dup?.Partida}, NumPaqTronco: ${dup?.NumPaqTronco}`
          )
          .join(' | ');
        throw new ApiError(
          `Duplicate found in (Tronco + Partida + NumPaqTronco).Details :${duplicateDetails}`,
          StatusCodes.BAD_REQUEST
        );
      }
      // try {

      await dressing_raw_machine_data_model.insertMany(batch, {
        ordered: false,
        // session,
      });
      console.log(`✅ Batch ${i / batch_size + 1} inserted successfully`);
    }
    await session.commitTransaction();
    console.log('✅ Transaction Committed');
    const response = new ApiResponse(
      StatusCodes?.OK,
      'Bulk Uploaded Successfully'
    );
    return res.status(StatusCodes.OK).json(response);
  } catch (error) {
    await session.abortTransaction();
    console.log('❌ Transaction Aborted');
    return next(error);
  } finally {
    await session.endSession();
  }
};

export const fetch_all_issue_for_dressing_items_by_item_other_details_id = 
  catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
    }

    const result = await issue_for_dressing_model.aggregate([
      {
        $match: {
          $or: [
            {
              peeling_done_other_details_id:
                mongoose.Types.ObjectId.createFromHexString(id),
            },
            {
              slicing_done_other_details_id:
                mongoose.Types.ObjectId.createFromHexString(id),
            },
          ],
        },
      },
    ]);
    const response = new ApiResponse(
      StatusCodes.OK,
      'Data fetched successfully',
      result
    );

    return res.status(StatusCodes.OK).json(response);
  });

export const list_issue_for_dressing_raw_machine_data = catchAsync(
  async (req, res) => {
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
    } = req.body.searchFields || {};

    const { filter } = req.body;
    let search_query = {};

    if (search != '' && req?.body?.searchFields) {
      const search_data = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );

      if (search_data?.length === 0) {
        throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
      }
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const matchQuery = {
      ...search_query,
      ...filterData,
    };

    const aggMatch = {
      $match: {
        ...matchQuery,
      },
    };

    const aggSort = {
      $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
    };

    const aggSkip = {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    };

    const aggLimit = {
      $limit: parseInt(limit),
    };

    const all_aggregates = [aggMatch, aggSort, aggSkip, aggLimit];

    const list_dressing_raw_machine_data =
      await dressing_raw_machine_data_model.aggregate(all_aggregates);

    const aggCount = {
      $count: 'totalCount',
    };

    const aggCountTotalDocs = [aggMatch, aggCount];

    const total_docs =
      await dressing_raw_machine_data_model.aggregate(aggCountTotalDocs);

    const totalPages = Math.ceil(
      (total_docs?.[0]?.totalCount || 0) / parseInt(limit)
    );

    const response = new ApiResponse(
      StatusCodes.OK,
      'Dressing Raw Machine Data Fetched Successfully',
      { data: list_dressing_raw_machine_data, totalPages: totalPages }
    );

    return res.status(StatusCodes.OK).json(response);
  }
);
export const list_issue_for_dressing_machine_miss_match_data = catchAsync(
  async (req, res) => {
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
    } = req.body.searchFields || {};

    const { filter } = req.body;
    let search_query = {};

    if (search != '' && req?.body?.searchFields) {
      const search_data = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );

      if (search_data?.length === 0) {
        throw new ApiError('NO Data found...', StatusCodes.NOT_FOUND);
      }
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const matchQuery = {
      ...search_query,
      ...filterData,
    };

    const aggMatch = {
      $match: {
        ...matchQuery,
        process_status: { $ne: dressing_error_types?.dressing_done },
      },
    };

    const aggSort = {
      $sort: { [sortBy]: sort === 'desc' ? -1 : 1 },
    };

    const aggSkip = {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    };

    const aggLimit = {
      $limit: parseInt(limit),
    };

    const all_aggregates = [aggMatch, aggSort, aggSkip, aggLimit];

    const list_dressing_machine_missmatch_data =
      await dressing_miss_match_data_model.aggregate(all_aggregates);

    const aggCount = {
      $count: 'totalCount',
    };

    const aggCountTotalDocs = [aggMatch, aggCount];

    const total_docs =
      await dressing_miss_match_data_model.aggregate(aggCountTotalDocs);

    const totalPages = Math.ceil(
      (total_docs?.[0]?.totalCount || 0) / parseInt(limit)
    );

    const response = new ApiResponse(
      StatusCodes.OK,
      'Dressing Machine MisMatch Data Fetched Successfully',
      { data: list_dressing_machine_missmatch_data, totalPages: totalPages }
    );

    return res.status(StatusCodes.OK).json(response);
  }
);

export const update_machine_raw_and_mismatch_data = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user_details = req.userDetails;
  const { updated_details } = req.body;

  if (!id) {
    throw new ApiError('ID is missing', StatusCodes.NOT_FOUND);
  }

  if (!isValidObjectId(id)) {
    throw new ApiError('Invalid ID ', StatusCodes.BAD_REQUEST);
  };

  if (!updated_details) {
    throw new ApiError('Updated Details are required', StatusCodes.BAD_REQUEST);
  }
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const old_machine_missmatch_data = await dressing_miss_match_data_model.findById(id).lean().session(session);

    if (!old_machine_missmatch_data) {
      throw new ApiError('Dressing Machine Mismatch Data not found', StatusCodes.NOT_FOUND);
    };

    const old_machine_raw_data = await dressing_raw_machine_data_model.findOne({
      Tronco: old_machine_missmatch_data?.log_no_code, Partida: old_machine_missmatch_data?.pallet_number,
      NumPaqTronco: old_machine_missmatch_data?.bundle_number
    }).lean().session(session);
    if (!old_machine_raw_data) {
      throw new ApiError('Dressing Machine Raw Data not found', StatusCodes.NOT_FOUND);
    };


    const updated_machine_missmatch_data = {
      log_no_code: updated_details?.log_no_code,
      pallet_number: updated_details?.pallet_number,
      bundle_number: updated_details?.bundle_number,
      thickness: updated_details?.thickness,
      length: updated_details?.length,
      width: updated_details?.width,
      no_of_leaves: updated_details?.no_of_leaves,
      sqm: updated_details?.sqm,
      updated_by: user_details?._id,
      updated_at: new Date()
    };


    const updated_machine_raw_data = {
      Tronco: updated_details?.log_no_code,
      Partida: updated_details?.pallet_number,
      NumPaqTronco: updated_details?.bundle_number,
      Grosor: updated_details?.thickness,
      Largo: updated_details?.length,
      Ancho: updated_details?.width,
      Hojas: updated_details?.no_of_leaves,
      M2: updated_details?.sqm,
      updated_by: user_details?._id,
      updated_at: new Date()
    };

    const update_machine_missmatch_data_result = await dressing_miss_match_data_model.updateOne({ _id: old_machine_missmatch_data?._id }, { $set: updated_machine_missmatch_data }).session(session);
    if (!update_machine_missmatch_data_result?.acknowledged || update_machine_missmatch_data_result?.modifiedCount === 0) {
      throw new ApiError('Failed to update dressing mismatch data', StatusCodes.BAD_REQUEST);
    }

    const update_machine_raw_data_result = await dressing_raw_machine_data_model.updateOne({
      Tronco: old_machine_missmatch_data?.log_no_code, Partida: old_machine_missmatch_data?.pallet_number,
      NumPaqTronco: old_machine_missmatch_data?.bundle_number
    }, { $set: updated_machine_raw_data }).session(session);

    if (!update_machine_raw_data_result?.acknowledged || update_machine_raw_data_result?.modifiedCount === 0) {
      throw new ApiError('Failed to update dressing machine raw data', StatusCodes.BAD_REQUEST);
    };

    const response = new ApiResponse(StatusCodes.OK, 'Dressing Machine Raw Data and Mismatch Data updated successfully', {
      updated_machine_missmatch_data: update_machine_missmatch_data_result,
      updated_machine_raw_data: update_machine_raw_data_result
    });
    await session.commitTransaction();
    return res.status(response.statusCode).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

})