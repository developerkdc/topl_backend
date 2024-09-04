import mongoose from "mongoose";
import { OrderModel } from "../../database/schema/order/orders.schema.js";
import { QcDoneInventoryModel } from "../../database/schema/qcDone.js/qcDone.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import { DispatchModel } from "../../database/schema/dispatch/dispatch.schema.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";

export const CreateDispatch = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  console.log(req.body);

  try {
    const authUserDetail = req.userDetails;
    const data = { ...req.body, created_employee_id: authUserDetail._id };
    const order = await OrderModel.findById(data.order_id).session(session);

    if (!order) {
      throw new Error("Order Not Found");
    }
    if (order.order_type == "group") {
      for (const dispatchDetail of data.group_dispatch_details) {
        for (const item of dispatchDetail.dispatch) {
          const updateQc = await QcDoneInventoryModel.findById(
            item.qc_id
          ).session(session);
          console.log(updateQc, "updateQc");
          if (
            !updateQc ||
            updateQc.qc_no_of_pcs_available < item.qc_dispatched_qty
          ) {
            throw new Error("Qc inventory out of stock");
          }
          updateQc.qc_no_of_pcs_available -= item.qc_dispatched_qty;
          updateQc.qc_sqm -= item.dispatch_sqm;
          updateQc.qc_sqm = parseFloat(updateQc.qc_sqm).toFixed(2);
          if (updateQc.qc_no_of_pcs_available === 0) {
            updateQc.status = "not available";
          }
          await updateQc.save();
        }

        const index = order.group_order_details.findIndex(
          (detail) => detail.item_no === dispatchDetail.item_no
        );
        if (index === -1) {
          throw new Error("Item not found in group_order_details");
        }

        let updatedFields = {
          order_dispatched_pcs_qty:
            order.group_order_details[index].order_dispatched_pcs_qty +
            dispatchDetail.total_pcs,
          order_balance_pcs_qty:
            order.group_order_details[index].order_balance_pcs_qty -
            dispatchDetail.total_pcs,
        };

        if (updatedFields.order_balance_pcs_qty === 0) {
          updatedFields.order_status = "closed";
        }

        const objData = JSON.parse(
          JSON.stringify(order.group_order_details[index])
        );
        order.group_order_details[index] = {
          ...objData,
          ...updatedFields,
        };

        await order.save();
      }
    }

    if (order.order_type == "raw") {
      for (const dispatchDetail of data.raw_dispatch_details) {
        for (const item of dispatchDetail.dispatch) {
          const rawData = await RawMaterialModel.findById(item.raw_material_id);
          const dispatchedQuantity = item.dispatched_quantity;
          const availableQuantity = rawData.item_available_pattas;
          if (dispatchedQuantity > availableQuantity) {
            console.log("innnnnnnnn");
            throw new Error(
              `Dispatch quantity for ${item} exceeds available quantity.`
            );
          }
          // const dispatch_quantities = {
          //   natural: item.natural,
          //   dyed: item.dyed,
          //   smoked: item.smoked,
          //   total: item.total,
          // };
          // const items = Object.keys(dispatch_quantities);
          // for (let item of items) {
          //   console.log(dispatch_quantities[item],'dispatch_quantities[item]');
          //   if (
          //     dispatch_quantities[item] >
          //     rawData.item_available_quantities[item]
          //   ) {
          //     throw new Error(
          //       `Dispatch quantity for ${item} exceeds available quantity.`
          //     );
          //   }
          // }
          const originalRawDataInventory = JSON.parse(JSON.stringify(rawData));

          // rawData.item_available_quantities = {
          //   natural:
          //     originalRawDataInventory.item_available_quantities.natural -
          //     dispatch_quantities.natural,
          //   dyed:
          //     originalRawDataInventory.item_available_quantities.dyed -
          //     dispatch_quantities.dyed,
          //   smoked:
          //     originalRawDataInventory.item_available_quantities.smoked -
          //     dispatch_quantities.smoked,
          //   total:
          //     originalRawDataInventory.item_available_quantities.total -
          //     dispatch_quantities.total,
          // };

          rawData.item_available_pattas =
            originalRawDataInventory.item_available_pattas - dispatchedQuantity;

          rawData.item_available_sqm = parseFloat(
            originalRawDataInventory.item_available_sqm - item.dispatch_sqm
          ).toFixed(2);

          if (rawData.item_available_pattas == 0) {
            rawData.status = "not available";
          }
          rawData.save({ validateBeforeSave: false });
        }
        const index = order.raw_order_details.findIndex(
          (detail) => detail.item_no === dispatchDetail.item_no
        );
        if (index === -1) {
          throw new Error("Item not found in raw_order_details");
        }

        let updatedFields = {
          dispatched_quantity:
            order.raw_order_details[index].dispatched_quantity +
            dispatchDetail.total_pattas,

          // dispatched_quantity: {
          //   natural:
          //     order.raw_order_details[index].dispatched_quantity.natural +
          //     dispatchDetail.total_pattas.natural,
          //   dyed:
          //     order.raw_order_details[index].dispatched_quantity.dyed +
          //     dispatchDetail.total_pattas.dyed,
          //   smoked:
          //     order.raw_order_details[index].dispatched_quantity.smoked +
          //     dispatchDetail.total_pattas.smoked,
          //   total:
          //     order.raw_order_details[index].dispatched_quantity.total +
          //     dispatchDetail.total_pattas.total,
          // },

          balance_quantity:
            order.raw_order_details[index].balance_quantity -
            dispatchDetail.total_pattas,
          // balance_quantity: {
          //   natural:
          //     order.raw_order_details[index].balance_quantity.natural -
          //     dispatchDetail.total_pattas.natural,
          //   dyed:
          //     order.raw_order_details[index].balance_quantity.dyed -
          //     dispatchDetail.total_pattas.dyed,
          //   smoked:
          //     order.raw_order_details[index].balance_quantity.smoked -
          //     dispatchDetail.total_pattas.smoked,
          //   total:
          //     order.raw_order_details[index].balance_quantity.total -
          //     dispatchDetail.total_pattas.total,
          // },
        };

        if (
          updatedFields.balance_quantity === 0
          // updatedFields.balance_quantity.dyed === 0 &&
          // updatedFields.balance_quantity.smoked === 0 &&
          // updatedFields.balance_quantity.total === 0
        ) {
          updatedFields.order_status = "closed";
        }

        const objData = JSON.parse(
          JSON.stringify(order.raw_order_details[index])
        );
        order.raw_order_details[index] = {
          ...objData,
          ...updatedFields,
        };

        await order.save();
      }
    }

    const dispatch = await new DispatchModel(data);
    const dispatchSaved = await dispatch.save();

    await session.commitTransaction();
    session.endSession();

    return res.json({ msg: "Dispatch Created" });
  } catch (error) {
    console.error("Error processing dispatch:", error);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error: "An error occurred while processing the dispatch",
      msg: error.message,
    });
  }
});

export const ListRawDispatchCreated = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || "";

  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
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
        message: "Results Not Found",
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery["dispatched_date"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  const issuedForFinishingView =
    mongoose.connection.db.collection("dispatch_raw_view");
  const totalDocuments = await issuedForFinishingView.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
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
    result: issuedForFinishingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const ListGroupDispatchCreated = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || "";

  let searchQuery = {};
  if (search != "" && req?.body?.searchFields) {
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
        message: "Results Not Found",
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    console.log(new Date(from));
    matchQuery["dispatched_date"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  const issuedForFinishingView = mongoose.connection.db.collection(
    "dispatch_group_view"
  );
  const totalDocuments = await issuedForFinishingView.countDocuments({
    ...matchQuery,
    ...searchQuery,
  });
  const totalPages = Math.ceil(totalDocuments / limit);

  const issuedForFinishingData = await issuedForFinishingView
    .aggregate([
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
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
    result: issuedForFinishingData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const AvailableGroupData = catchAsync(async (req, res, next) => {
  const { group_no } = req.query;
  console.log(group_no);
  const groupData = await QcDoneInventoryModel.find({
    status: "available",
    group_no: group_no,
  });
  console.log(groupData);
  if (groupData.length <= 0) {
    throw new Error("Group Not Available In Inventory For Dispatch");
  }
  return res.json({ message: "success", result: groupData });
});

// export const AvailableRawData = catchAsync(async (req, res, next) => {
//   const data = req.body;
//   if (!data.item_name && !data.item_code) {
//     throw new Error("Provide item name and item code");
//   }

//   const availableData = await RawMaterialModel.find({
//     item_name: data.item_name,
//     item_code: data.item_code,
//     status: "available",
//   });

//   if (availableData.length <= 0) {
//     throw new Error("Data not available");
//   }
//   return res.json({ message: "success", result: availableData });
// });

export const AvailableRawData = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sort = "desc",
    item_pallete_no,
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  // Extract filters from the request body
  const { item_name, item_code } = req.body;

  // Check if either item_name or item_code is provided
  if (!item_name && !item_code) {
    throw new Error("Provide item name or item code");
  }

  // Construct the filter object
  const filter = {
    status: "available",
  };

  // Add item_name and item_code to the filter if provided
  if (item_name) {
    filter.item_name = item_name;
  }
  if (item_code) {
    filter.item_code = item_code;
  }

  // Add palletNumber filter if provided
  if (item_pallete_no) {
    filter.item_pallete_no = item_pallete_no;
  }

  // Execute the MongoDB query with pagination
  const availableData = await RawMaterialModel.find(filter)
    .sort({ [sortBy]: sort })
    .skip(skip)
    .limit(limit);

  // Check if any data is found
  if (availableData.length <= 0) {
    throw new Error("Data not available");
  }

  // Calculate total documents matching the filter
  const totalDocuments = await RawMaterialModel.countDocuments(filter);

  // Calculate total pages
  const totalPages = Math.ceil(totalDocuments / limit);

  // Return the results
  return res.status(200).json({
    result: availableData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const DeleteRawDispatch = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { dispatchId } = req.query;
    const dispatch = mongoose.connection.db.collection("dispatch_raw_view");
    const dispatchDetails = await dispatch.findOne({
      _id: new mongoose.Types.ObjectId(dispatchId),
    });
    const order = await OrderModel.findById(dispatchDetails.order_id).session(
      session
    );
    for (const dispatchDetail of dispatchDetails.raw_dispatch_details) {
      for (const item of dispatchDetail.dispatch) {
        const rawData = await RawMaterialModel.findById(item.raw_material_id);
        console.log(item, "ittttttttttttttt");
        console.log(rawData, "rawwwwwwwwww");
        const dispatch_quantities = {
          natural: item.natural,
          dyed: item.dyed,
          smoked: item.smoked,
          total: item.total,
        };
        const items = Object.keys(dispatch_quantities);

        const originalRawDataInventory = JSON.parse(JSON.stringify(rawData));
        rawData.item_available_quantities = {
          natural:
            originalRawDataInventory.item_available_quantities.natural +
            dispatch_quantities.natural,
          dyed:
            originalRawDataInventory.item_available_quantities.dyed +
            dispatch_quantities.dyed,
          smoked:
            originalRawDataInventory.item_available_quantities.smoked +
            dispatch_quantities.smoked,
          total:
            originalRawDataInventory.item_available_quantities.total +
            dispatch_quantities.total,
        };
        rawData.item_available_pattas =
          originalRawDataInventory.item_available_pattas +
          dispatch_quantities.total;

        rawData.item_available_sqm = parseFloat(
          originalRawDataInventory.item_available_sqm + item.dispatch_sqm
        ).toFixed(2);

        if (rawData.item_available_pattas !== 0) {
          rawData.status = "available";
        }
        rawData.save({ validateBeforeSave: false });
      }
      const index = order.raw_order_details.findIndex(
        (detail) => detail.item_no === dispatchDetail.item_no
      );
      if (index === -1) {
        throw new Error("Item not found in raw_order_details");
      }

      let updatedFields = {
        dispatched_quantity: {
          natural:
            order.raw_order_details[index].dispatched_quantity.natural -
            dispatchDetail.total_pattas.natural,
          dyed:
            order.raw_order_details[index].dispatched_quantity.dyed -
            dispatchDetail.total_pattas.dyed,
          smoked:
            order.raw_order_details[index].dispatched_quantity.smoked -
            dispatchDetail.total_pattas.smoked,
          total:
            order.raw_order_details[index].dispatched_quantity.total -
            dispatchDetail.total_pattas.total,
        },

        balance_quantity: {
          natural:
            order.raw_order_details[index].balance_quantity.natural +
            dispatchDetail.total_pattas.natural,
          dyed:
            order.raw_order_details[index].balance_quantity.dyed +
            dispatchDetail.total_pattas.dyed,
          smoked:
            order.raw_order_details[index].balance_quantity.smoked +
            dispatchDetail.total_pattas.smoked,
          total:
            order.raw_order_details[index].balance_quantity.total +
            dispatchDetail.total_pattas.total,
        },
      };

      if (
        updatedFields.balance_quantity.natural !== 0 ||
        updatedFields.balance_quantity.dyed !== 0 ||
        updatedFields.balance_quantity.smoked !== 0 ||
        updatedFields.balance_quantity.total !== 0
      ) {
        updatedFields.order_status = "open";
      }

      const objData = JSON.parse(
        JSON.stringify(order.raw_order_details[index])
      );
      order.raw_order_details[index] = {
        ...objData,
        ...updatedFields,
      };

      await order.save();
    }

    await DispatchModel.findOneAndDelete({ _id: dispatchId });
    await session.commitTransaction();
    session.endSession();
    return res.json({
      message: "success",
      result: "Dispatch Deleted Successfully",
    });
    // Handle dispatchDetails...
  } catch (error) {
    console.error("Error processing dispatch:", error);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error: "An error occurred while processing the delete dispatch",
      msg: error.message,
    });
  }
});

export const DeleteGroupDispatch = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { dispatchId } = req.query;
    const dispatch = mongoose.connection.db.collection("dispatch_group_view");
    const dispatchDetails = await dispatch.findOne({
      _id: new mongoose.Types.ObjectId(dispatchId),
    });
    const order = await OrderModel.findById(dispatchDetails.order_id).session(
      session
    );
    for (const dispatchDetail of dispatchDetails.group_dispatch_details) {
      for (const item of dispatchDetail.dispatch) {
        const updateQc = await QcDoneInventoryModel.findById(
          item.qc_id
        ).session(session);

        updateQc.qc_no_of_pcs_available += item.qc_dispatched_qty;
        updateQc.qc_sqm += item.dispatch_sqm;
        updateQc.qc_sqm = parseFloat(updateQc.qc_sqm).toFixed(2);
        if (updateQc.qc_no_of_pcs_available !== 0) {
          updateQc.status = "available";
        }
        await updateQc.save();
      }

      const index = order.group_order_details.findIndex(
        (detail) => detail.item_no === dispatchDetail.item_no
      );
      if (index === -1) {
        throw new Error("Item not found in group_order_details");
      }

      let updatedFields = {
        order_dispatched_pcs_qty:
          order.group_order_details[index].order_dispatched_pcs_qty -
          dispatchDetail.total_pcs,
        order_balance_pcs_qty:
          order.group_order_details[index].order_balance_pcs_qty +
          dispatchDetail.total_pcs,
      };

      if (updatedFields.order_balance_pcs_qty !== 0) {
        updatedFields.order_status = "open";
      }

      const objData = JSON.parse(
        JSON.stringify(order.group_order_details[index])
      );
      order.group_order_details[index] = {
        ...objData,
        ...updatedFields,
      };

      await order.save();
    }
    await DispatchModel.findOneAndDelete({ _id: dispatchId });
    await session.commitTransaction();
    session.endSession();
    return res.json({
      message: "success",
      result: "Dispatch Deleted Successfully",
    });
    // Handle dispatchDetails...
  } catch (error) {
    console.error("Error processing dispatch:", error);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error: "An error occurred while processing the delete dispatch",
      msg: error.message,
    });
  }
});

export const ListItemPallete = catchAsync(async (req, res, next) => {
  const { item_name, item_code } = req.query;

  try {
    const items = await RawMaterialModel.find({ item_name, item_code });
    const paletteNumbers = [
      ...new Set(items.map((item) => item.item_pallete_no)),
    ].map((pallete_no) => ({ pallete_no }));

    res
      .status(200)
      .json({ result: paletteNumbers, statusCode: 200, status: "success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
