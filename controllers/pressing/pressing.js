import { IssuedForFinishingModel } from '../../database/schema/finishing/issuedForFinishing.schema.js';
import { IssuedForPressingModel } from '../../database/schema/pressing/issuedForPressing.schema.js';
import { PressingModel } from '../../database/schema/pressing/pressing.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import mongoose from 'mongoose';
import { CreateReadySheetFormModel } from '../../database/schema/readySheetForm/readySheetForm.schema.js';
import { ReadySheetFormHistoryModel } from '../../database/schema/readySheetForm/readySheetFormHistory.schema.js';
import OtherGoodsModel from '../../database/schema/inventory/otherGoods/otherGoods.schema.js';
import OtherGoodsConsumedModel from '../../database/schema/inventory/otherGoods/otherGoodsConsumed.schema.js';
export const FetchIssuedForPressing = catchAsync(async (req, res, next) => {
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
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const totalDocuments = await IssuedForPressingModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForPressingView = mongoose.connection.db.collection(
    'issued_for_pressings_view'
  );
  const issuedForPressingData = await issuedForPressingView
    .aggregate([
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
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForPressingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const createPressing = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const authUserDetail = req.userDetails;
    const isIssued = await IssuedForPressingModel.findById(
      req.body.issued_for_pressing_id
    );
    if (!isIssued) {
      throw new Error('Issued For Pressing Done or Not Found');
    }
    const totalAvailable = await OtherGoodsModel.aggregate([
      { $match: { item_name: req.body.consumed_item_name } },
      { $group: { _id: '$item_name', total: { $sum: '$available_quantity' } } },
    ]);

    if (totalAvailable[0].total < req.body.consumed_quantity) {
      return res.status(400).json({
        result: [],
        statusCode: 400,
        status: false,
        message: 'Insufficient consumable quantity..',
      });
    }

    let otherGoods = await OtherGoodsModel.find({
      item_name: req.body.consumed_item_name,
    }).sort({ created_at: 1 });
    let consumedDetails = [];
    let remainingQuantity = req.body.consumed_quantity;
    // looping through all inward for the selected consumable item
    for (let item of otherGoods) {
      if (remainingQuantity <= 0) break;
      if (item.available_quantity <= 0) continue;
      const consumeFromItem = Math.min(
        item.available_quantity,
        remainingQuantity
      );
      // Update the item's available_quantity in other goods collection
      let updatedOtherGoods = await OtherGoodsModel.findByIdAndUpdate(
        { _id: item._id },
        {
          $inc: { available_quantity: -consumeFromItem },
          $set: {
            updated_at: Date.now(),
          },
        },
        { new: true, session }
      ).lean();

      let newConsumedObject = {
        date_of_inward: item.date_of_inward,
        item_name: updatedOtherGoods?.item_name,
        units: updatedOtherGoods?.units,
        rate: updatedOtherGoods?.rate,
        received_quantity: updatedOtherGoods?.received_quantity,
        available_quantity: updatedOtherGoods?.available_quantity,
        date_of_consumption: req.body.date_of_consumption,
        consumption_quantity: consumeFromItem,
        processes: 'Pressing',
        supplier_details: updatedOtherGoods?.supplier_details,
        other_goods_consumed_remarks: req.body?.consumed_remarks,
        created_employee_id: authUserDetail?._id,
        other_goods_remarks: updatedOtherGoods?.other_goods_remarks,
      };

      const res = await OtherGoodsConsumedModel.create([newConsumedObject], {
        session,
      });
      console.log(res, 'res');
      const createdDoc = res[0];
      consumedDetails.push({
        other_goods_consumed_id: createdDoc._id,
        item_id: item._id,
        date_of_inward: item.date_of_inward,
        item_name: updatedOtherGoods?.item_name,
        units: updatedOtherGoods?.units,
        rate: updatedOtherGoods?.rate,
        received_quantity: updatedOtherGoods?.received_quantity,
        available_quantity: updatedOtherGoods?.available_quantity,
        date_of_consumption: req.body.date_of_consumption,
        consumed_quantity: consumeFromItem,
        supplier_details: updatedOtherGoods?.supplier_details,
      });
      remainingQuantity -= consumeFromItem;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const data = {
      ...req.body,
      consumed_item_name: req.body?.consumed_item_name,
      consumed_details: consumedDetails,
      consumed_quantity: req.body.consumed_quantity,
      date_of_consumption: req.body.date_of_consumption,
      created_employee_id: authUserDetail._id,
      other_goods_consumed_remarks: req.body?.consumed_remarks,
    };

    const pressingData = new PressingModel(data);
    const pressingDataSaved = await pressingData.save({ session: session });

    const finishingData = {
      group_no: pressingDataSaved.group_no,
      tapping_id: pressingDataSaved.tapping_id,
      ready_sheet_form_inventory_id:
        pressingDataSaved.ready_sheet_form_inventory_id,
      ready_sheet_form_history_id:
        pressingDataSaved.ready_sheet_form_history_id,
      available_pressed_pcs: req.body.available_pressed_pcs,
      issued_for_pressing_id: req.body.issued_for_pressing_id,
      pressing_id: pressingDataSaved._id,
      created_employee_id: authUserDetail._id,
    };
    const finishing = new IssuedForFinishingModel(finishingData);
    const finishingSaved = await finishing.save({ session: session });

    await IssuedForPressingModel.findByIdAndUpdate(
      data.issued_for_pressing_id,
      { $set: { revert_status: 'inactive' } },
      { new: true, session: session }
    );
    const ReadySheetFormData = await CreateReadySheetFormModel.findById(
      pressingData.ready_sheet_form_inventory_id
    );

    let ReadySheetFormSqm =
      (ReadySheetFormData.ready_sheet_form_length *
        ReadySheetFormData.ready_sheet_form_width *
        data.remaining_no_of_peices) /
      10000;

    ReadySheetFormSqm = parseFloat(ReadySheetFormSqm).toFixed(2);
    ReadySheetFormSqm = parseFloat(ReadySheetFormSqm);
    ReadySheetFormData.ready_sheet_form_no_of_pcs_available +=
      data.remaining_no_of_peices;
    ReadySheetFormData.ready_sheet_form_sqm += ReadySheetFormSqm;
    // ReadySheetFormData.ready_sheet_form_sqm = parseFloat(
    //   ReadySheetFormData.ready_sheet_form_sqm
    // ).toFixed(2);
    if (ReadySheetFormData.ready_sheet_form_no_of_pcs_available > 0) {
      ReadySheetFormData.status = 'available';
    }
    await ReadySheetFormData.save({ session });
    const ReadySheetFormHistoryData = await ReadySheetFormHistoryModel.findById(
      pressingDataSaved.ready_sheet_form_history_id
    );

    ReadySheetFormHistoryData.ready_sheet_form_no_of_pcs_available +=
      data.remaining_no_of_peices;
    ReadySheetFormHistoryData.ready_sheet_form_sqm -= ReadySheetFormSqm;
    // ReadySheetFormHistoryData.ready_sheet_form_sqm = parseFloat(
    //   ReadySheetFormHistoryData.ready_sheet_form_sqm
    // ).toFixed(2);
    ReadySheetFormHistoryData.ready_sheet_form_approved_pcs =
      data.pressing_no_of_peices;

    await ReadySheetFormHistoryData.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      result: pressingDataSaved,
      statusCode: 200,
      status: 'success',
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return res.status(500).json({
      status: false,
      message: 'Error occurred while pressing',
      error: error.message,
    });
  }
});

export const FetchPressingDone = catchAsync(async (req, res, next) => {
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
    matchQuery['created_at'] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const totalDocuments = await PressingModel.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForPressingView =
    mongoose.connection.db.collection('pressings_view');
  const issuedForPressingData = await issuedForPressingView
    .aggregate([
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
    ])
    .toArray();
  return res.status(200).json({
    result: issuedForPressingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const RevertIssuedForPressing = catchAsync(async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const { issuedId } = req.query;
    const IssuedForPressingView = mongoose.connection.db.collection(
      'issued_for_pressings_view'
    );
    const IssuedForPressingDetails = await IssuedForPressingView.findOne({
      _id: new mongoose.Types.ObjectId(issuedId),
    });
    if (!IssuedForPressingDetails) {
      throw new Error('Issued For Pressing not found');
    }

    const readySheetForm = await CreateReadySheetFormModel.findById(
      IssuedForPressingDetails.ready_sheet_form_inventory_id
    ).session(session);
    // console.log(readySheetForm);
    if (!readySheetForm) {
      throw new Error('Ready Sheet Form Not Found');
    }
    const calculation =
      (readySheetForm.ready_sheet_form_length *
        readySheetForm.ready_sheet_form_width *
        IssuedForPressingDetails.ready_sheet_form_history_details
          .ready_sheet_form_approved_pcs) /
      10000;
    // Update ready sheet form quantities
    readySheetForm.ready_sheet_form_no_of_pcs_available +=
      IssuedForPressingDetails.ready_sheet_form_history_details.ready_sheet_form_approved_pcs;
    readySheetForm.ready_sheet_form_sqm += parseFloat(calculation.toFixed(2));

    readySheetForm.status = 'available';

    const updatedReadySheet = await readySheetForm.save(session);

    await ReadySheetFormHistoryModel.findByIdAndDelete(
      IssuedForPressingDetails.ready_sheet_form_history_details._id
    ).session(session);
    await IssuedForPressingModel.findByIdAndDelete(
      IssuedForPressingDetails._id
    ).session(session);
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Issued for pressing reverted',
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
