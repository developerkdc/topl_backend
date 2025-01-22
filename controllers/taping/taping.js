import mongoose from 'mongoose';
import { IssueForTapingModel } from '../../database/schema/taping/issuedTaping.schema.js';
import { CreateTappingModel } from '../../database/schema/taping/taping.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { CreateReadySheetFormModel } from '../../database/schema/readySheetForm/readySheetForm.schema.js';
import GroupImagesModel from '../../database/schema/images/groupImages.schema.js';
import fs from 'fs';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import { IssuedForCuttingModel } from '../../database/schema/cutting/issuedForCutting.js';
import { CuttingModel } from '../../database/schema/cutting/cutting.js';
import { GroupModel } from '../../database/schema/group/groupCreated/groupCreated.schema.js';
import { RawMaterialModel } from '../../database/schema/inventory/raw/raw.schema.js';

export const FetchIssuedForTapping = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  console.log(req?.body?.searchFields);
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
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
  console.log(req?.body?.filters, 'req?.body?.filters');
  const matchQuery = data || {};

  console.log(matchQuery, 'matchQuery');
  if (to && from) {
    console.log(new Date(from));
    matchQuery['issued_for_taping_date'] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const totalDocuments = await IssueForTapingModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForGroupingData = await IssueForTapingModel.aggregate([
    {
      $lookup: {
        from: 'cuttings',
        localField: 'cutting_id',
        foreignField: '_id',
        pipeline: [
          {
            $unwind: '$item_details', // Unwind to access each item_detail individually
          },
          {
            $lookup: {
              from: 'raw_materials',
              localField: 'item_details.item_id',
              foreignField: '_id',
              as: 'item_details.item_data', // Populate item_data field with data from raw_materials
            },
          },
          {
            $group: {
              _id: '$_id',
              cutting_id: { $push: '$$ROOT' }, // Push back the modified cuttings documents into cutting_id array
            },
          },
        ],
        as: 'cutting_id',
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'cutting_id.cutting_id.group_id',
        foreignField: '_id',
        // pipeline: [
        //   {
        //     $project: {
        //       group_no: 1,
        //     },
        //   },
        // ],
        as: 'group_data',
      },
    },
    {
      $unwind: {
        path: '$group_data',
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
  console.log(issuedForGroupingData, 'issuedForGroupingData');
  return res.status(200).json({
    result: issuedForGroupingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const CreateTapping = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authUserDetail = req.userDetails;
    const item_details = JSON?.parse(req.body.tapping_details);

    const data = {
      ...req.body,
      created_employee_id: authUserDetail._id,
    };
    console.log(data, 'data');
    const imageFilenames = req?.files?.tapping_images?.map(
      (file) => file?.filename
    );

    // console.log("Received body data:", req.body);
    console.log('Image filenames:', imageFilenames);

    // Check if cutting_id already exists in tapping collection
    const existingTapping = await CreateTappingModel.findOne({
      cutting_id: data.cutting_id,
    }).session(session);
    if (existingTapping) {
      throw new Error('Tapping with the same cutting_id already exists');
    }

    if (imageFilenames?.length > 0) {
      const existingDocument = await GroupImagesModel.findOne({
        group_no: req.body.group_no,
      }).session(session);
      console.log(existingDocument, 'existingDocument');
      if (existingDocument) {
        await GroupImagesModel.findOneAndUpdate(
          { group_no: req.body.group_no },
          { $push: { tapping_images: { $each: imageFilenames } } },
          { upsert: true, new: true, session }
        );
      } else {
        const updae = await GroupImagesModel.create(
          [
            {
              tapping_images: imageFilenames,
              group_no: req.body.group_no,
            },
          ],
          { session }
        );
        console.log(updae, 'updae');
      }
    }
    const tappingDocuments = [];
    item_details.forEach((e) => {
      const tappingData = {
        cutting_id: data.cutting_id,
        issued_for_tapping_id: req.body.issued_for_tapping_id,
        tapping_no_of_pcs: e.tapping_no_of_pcs,
        tapping_length: e.tapping_length,
        tapping_width: e.tapping_width,
        tapping_sqm: e.tapping_sqm,
        tapping_remarks: data.tapping_remarks,
        ready_sheet_form_no_of_pcs_available:
          e.ready_sheet_form_no_of_pcs_available,
        created_employee_id: authUserDetail._id,
        issued_for_taping_date: data.issued_for_taping_date,
        taping_done_date: data.taping_done_date,
        total_tapping_waste_sqm: data.total_tapping_waste_sqm,
        total_tapping_waste_sqm_percentage:
          data.total_tapping_waste_sqm_percentage,
        tapping_waste_sqm: e.tapping_waste_sqm,
        tapping_waste_sqm_percentage: e.tapping_waste_sqm_percentage,
      };
      tappingDocuments.push(tappingData);
    });

    const tappingSaveData = await CreateTappingModel.insertMany(
      tappingDocuments,
      {
        session,
      }
    );

    const tappingIds = tappingSaveData.map((saved) => saved._id);
    const readySheetFormDocuments = item_details.map((e, index) => ({
      group_no: data.group_no,
      tapping_id: tappingIds[index],
      issued_for_tapping_id: req.body.issued_for_tapping_id,
      ready_sheet_form_length: e.tapping_length,
      ready_sheet_form_width: e.tapping_width,
      ready_sheet_form_sqm: e.tapping_sqm,
      ready_sheet_form_no_of_pcs_original:
        e.ready_sheet_form_no_of_pcs_available,
      ready_sheet_form_no_of_pcs_available:
        e.ready_sheet_form_no_of_pcs_available,
      ready_sheet_form_pallete_no: data.ready_sheet_form_pallete_no,
      ready_sheet_form_physical_location:
        data.ready_sheet_form_physical_location,
      created_employee_id: authUserDetail._id,
    }));

    const readySheetFormSaveData = await CreateReadySheetFormModel.insertMany(
      readySheetFormDocuments,
      {
        session,
      }
    );
    // const tapping = item_details?.map((e) => ({
    //   cutting_id: e.cutting_id,
    //   tapping_no_of_pcs:  e.tapping_no_of_pcs,
    //   tapping_length:  e.tapping_length,
    //   tapping_width:  e.tapping_width,
    //   tapping_sqm: e.tapping_sqm,
    //   tapping_remarks:  e.tapping_remarks,
    //   ready_sheet_form_no_of_pcs_available : e.ready_sheet_form_no_of_pcs_available,
    //   created_employee_id: authUserDetail._id,
    //   issued_for_taping_date:e.issued_for_taping_date,
    //   taping_done_date:e.taping_done_date
    // }));

    // const tappingSaved = await CreateTappingModel.insertMany(tapping, {
    //   session,
    // });
    // const readySheetFormData = tappingSaved?.map((e) => ({
    // // const readySheetFormData = {
    //   group_no: data.group_no,
    //   tapping_id: e._id,
    //   ready_sheet_form_length: data.tapping_length,
    //   ready_sheet_form_width: data.tapping_width,
    //   ready_sheet_form_sqm: data.tapping_sqm,
    //   ready_sheet_form_no_of_pcs_original:
    //     data.ready_sheet_form_no_of_pcs_available,
    //   ready_sheet_form_no_of_pcs_available:
    //     data.ready_sheet_form_no_of_pcs_available,
    //   ready_sheet_form_pallete_no: data.ready_sheet_form_pallete_no,
    //   ready_sheet_form_physical_location:
    //     data.ready_sheet_form_physical_location,
    //   created_employee_id: authUserDetail._id,
    // }));

    // const readySheetForm = new CreateReadySheetFormModel(readySheetFormData);

    // const readySHeetFormSaved = await readySheetForm.save({ session });

    // await IssueForTapingModel.findByIdAndDelete(data.issued_for_taping_id);
    await IssueForTapingModel.findByIdAndUpdate(
      data.issued_for_tapping_id,
      { $set: { revert_status: 'inactive' } },
      { new: true, session: session }
    );
    await session.commitTransaction();
    session.endSession();

    return res.json({
      result: tappingSaveData,
      status: true,
      message: 'Tapping Done Successfully',
    });
  } catch (error) {
    console.error('Error occurred while tapping:', error);

    await session.abortTransaction();
    session.endSession();
    if (req.files) {
      const fileFields = Object.keys(req.files);
      fileFields.forEach((field) => {
        const uploadedFiles = req.files[field];
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach((file) => {
            fs.unlinkSync(file.path);
          });
        }
      });
    }

    return res.status(500).json({
      status: false,
      message: 'Error occurred while tapping',
      error: error.message,
    });
  }
});

export const FetchTappingDone = catchAsync(async (req, res, next) => {
  const { string, boolean, numbers, arrayField } =
    req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
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
    console.log(new Date(from));
    matchQuery['taping_done_date'] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const totalDocuments = await CreateTappingModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForGroupingData = await CreateTappingModel.aggregate([
    {
      $lookup: {
        from: 'cuttings',
        localField: 'cutting_id',
        foreignField: '_id',
        pipeline: [
          {
            $unwind: '$item_details', // Unwind to access each item_detail individually
          },
          {
            $lookup: {
              from: 'raw_materials',
              localField: 'item_details.item_id',
              foreignField: '_id',
              as: 'item_details.item_data', // Populate item_data field with data from raw_materials
            },
          },
          {
            $group: {
              _id: '$_id',
              cutting_id: { $push: '$$ROOT' }, // Push back the modified cuttings documents into cutting_id array
            },
          },
        ],
        as: 'cutting_id',
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'cutting_id.cutting_id.group_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              group_no: 1,
            },
          },
        ],
        as: 'group_data',
      },
    },
    {
      $unwind: {
        path: '$group_data',
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
    result: issuedForGroupingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

// export const RevertIssuedForTapping = catchAsync(async (req, res, next) => {
//   let session;
//   try {
//     session = await mongoose.startSession();
//     session.startTransaction();

//     const { issuedId } = req.query;
//     const IssuedForTappingsView = mongoose.connection.db.collection(
//       "issued_for_tapings_view"
//     );
//     const IssuedForTappingDetails = await IssuedForTappingsView.findOne({
//       _id: new mongoose.Types.ObjectId(issuedId),
//     });

//     if (!IssuedForTappingDetails) {
//       throw new Error("Issued for taping not found");
//     }

//     const issuedForCuttingData = await IssuedForCuttingModel.findById(
//       IssuedForTappingDetails.issued_for_cutting_id
//     ).session(session);

//     const cuttingsData = await CuttingModel.findById(
//       IssuedForTappingDetails.cutting_id._id
//     ).session(session);

//     const groupData = await GroupModel.findById(issuedForCuttingData.group_id)
//       .populate("item_details")
//       .session(session);

//     issuedForCuttingData.cutting_item_details.forEach((issuedItem) => {
//       const issuedItemId = issuedItem.item_id.toString();
//       const cuttingItem = cuttingsData.item_details.find(
//         (cutting) => cutting.item_id.toString() === issuedItemId
//       );
//       const groupRawItem = groupData.item_details.filter(
//         (raw) => raw?._id?.toString() === cuttingItem?.item_id?.toString()
//       );

//       if (!cuttingItem) {
//         throw new Error("Cannot revert");
//       }

//       const issuedCuttingQuantity = issuedItem.cutting_quantity;
//       const finalCuttingQuantity = cuttingItem.final_cutting_quantity;
//       const wasteCuttingQuantity = cuttingItem.waste_cutting_quantity;

//       if (
//         issuedCuttingQuantity?.total >
//         finalCuttingQuantity?.total +
//           wasteCuttingQuantity?.waste_pattas +
//           groupRawItem?.[0]?.item_available_quantities?.total
//       ) {
//         throw new Error("Cannot revert");
//       }
//     });
//     await IssuedForCuttingModel.findByIdAndUpdate(
//       IssuedForTappingDetails.issued_for_cutting_id,
//       { $set: { revert_status: "active" } },
//       { session, new: true }
//     );

//     await CuttingModel.findByIdAndDelete(
//       IssuedForTappingDetails.cutting_id._id
//     ).session(session);

//     await IssueForTapingModel.findByIdAndDelete(issuedId).session(session);

//     await session.commitTransaction();
//     session.endSession();

//     return res.json({
//       message: "success",
//       result: "Reverted Successfully",
//     });
//   } catch (error) {
//     if (session) {
//       await session.abortTransaction();
//       session.endSession();
//     }

//     return res.status(500).json({
//       status: false,
//       message: "Error occurred while reverting",
//       error: error.message,
//     });
//   }
// });

export const RevertIssuedForTapping = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { issuedId } = req.query;
    const IssuedForTappingsView = mongoose.connection.db.collection(
      'issued_for_tapings_view'
    );
    const IssuedForTappingDetails = await IssuedForTappingsView.findOne({
      _id: new mongoose.Types.ObjectId(issuedId),
    });

    if (!IssuedForTappingDetails) {
      throw new Error('Issued for taping not found');
    }

    const issuedForCuttingData = await IssuedForCuttingModel.findById(
      IssuedForTappingDetails.issued_for_cutting_id
    ).session(session);

    const cuttingsData = await CuttingModel.findById(
      IssuedForTappingDetails.cutting_id._id
    ).session(session);

    const groupData = await GroupModel.findById(issuedForCuttingData.group_id)
      .populate('item_details')
      .session(session);

    const IssuedForCuttingView = mongoose.connection.db.collection(
      'issued_for_cuttings_view'
    );

    issuedForCuttingData.cutting_item_details.forEach((issuedItem) => {
      const issuedItemId = issuedItem.item_id.toString();
      const cuttingItem = cuttingsData.item_details.find(
        (cutting) => cutting.item_id.toString() === issuedItemId
      );
      const groupRawItem = groupData.item_details.filter(
        (raw) => raw?._id?.toString() === cuttingItem?.item_id?.toString()
      );

      if (!cuttingItem) {
        throw new Error('Cannot revert');
      }

      const issuedCuttingQuantity = issuedItem.cutting_quantity;
      const finalCuttingQuantity = cuttingItem.final_cutting_quantity;
      const wasteCuttingQuantity = cuttingItem.waste_cutting_quantity;

      if (
        issuedCuttingQuantity >
        finalCuttingQuantity +
          wasteCuttingQuantity?.waste_pattas +
          groupRawItem?.[0]?.item_available_pattas
      ) {
        throw new Error('Cannot revert');
      }
    });
    await IssuedForCuttingModel.findByIdAndUpdate(
      IssuedForTappingDetails.issued_for_cutting_id,
      { $set: { revert_status: 'active' } },
      { session, new: true }
    );

    await CuttingModel.findByIdAndDelete(
      IssuedForTappingDetails.cutting_id._id
    ).session(session);

    await IssueForTapingModel.findByIdAndDelete(issuedId).session(session);

    //deduct updated pattas from created groups which were added during partial create cutting
    const IssuedForCuttingDetails = await IssuedForCuttingView.findOne({
      _id: IssuedForTappingDetails.issued_for_cutting_id,
    });
    const updateRaw = await Promise.all(
      IssuedForCuttingDetails?.cutting_item_details.map(async (ele) => {
        const addCuttingQty =
          await IssuedForTappingDetails.cutting_id.item_details.find(
            (cuttingData) =>
              cuttingData?.item_id.toString() === ele?.item_id?.toString()
          );

        if (!addCuttingQty) {
          throw new Error(
            `No cutting quantity found for item_id ${ele?.item_id}`
          );
        }

        const rawDetails = await RawMaterialModel.findById(ele?.item_id);
        let deductpattas = 0;

        deductpattas =
          ele.cutting_quantity -
          (addCuttingQty.final_cutting_quantity +
            addCuttingQty.waste_cutting_quantity.waste_pattas);

        let updateData = { ...rawDetails.item_available_pattas }; // Make a copy to avoid mutating original
        let availablePattas = rawDetails?.item_available_pattas - deductpattas;
        let availableSqm = parseFloat(
          (
            (rawDetails?.item_length *
              rawDetails?.item_width *
              availablePattas) /
            10000
          ).toFixed(2)
        );

        // Adjust updateData as per your data structure
        for (let key in updateData) {
          if (updateData[key] > 0) {
            updateData[key] -= deductpattas;
          }
        }
        await RawMaterialModel.findByIdAndUpdate(
          ele?.item_id,
          {
            $set: {
              item_available_quantities: updateData,
              item_available_pattas: availablePattas,
              item_available_sqm: availableSqm,
            },
          },
          { session, new: true }
        );
        // Return the updated data structure as needed
        return {
          item_available_pattas: availablePattas,
          item_available_sqm: availableSqm,
        };
      })
    );

    const groupUpdate = updateRaw.reduce(
      (accumulator, currentValue) => {
        accumulator.item_available_pattas += currentValue.item_available_pattas;
        accumulator.item_available_sqm += currentValue.item_available_sqm;
        return accumulator;
      },
      { item_available_pattas: 0, item_available_sqm: 0 }
    );

    //update group
    await GroupModel.findByIdAndUpdate(
      issuedForCuttingData.group_id,
      {
        $set: {
          group_no_of_pattas_available: groupUpdate.item_available_pattas,
          total_item_sqm_available: groupUpdate.item_available_sqm,
        },
      },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: 'success',
      result: 'Reverted Successfully',
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    return res.status(500).json({
      status: false,
      message: 'Error occurred while reverting',
      error: error.message,
    });
  }
});
