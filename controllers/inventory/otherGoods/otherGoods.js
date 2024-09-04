import mongoose from "mongoose";
import OtherGoodsModel from "../../../database/schema/inventory/otherGoods/otherGoods.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { IdRequired } from "../../../utils/response/response.js";
import OtherGoodsConsumedModel from "../../../database/schema/inventory/otherGoods/otherGoodsConsumed.schema.js";
import ApiError from "../../../utils/errors/apiError.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";

export const AddOtherGoods = catchAsync(async (req, res, next) => {
  const authUserDetail = req.userDetails;
  const data = req.body;
  const otherGoodsData = data.item_details.map((ele) => {
    return {
      date_of_inward: req.body.date_of_inward,
      supplier_details: req.body.supplier_details,
      created_employee_id: authUserDetail._id,
      ...ele,
    };
  });
  // console.log(rawData);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const newRaw = await OtherGoodsModel.insertMany(otherGoodsData, {
      session,
    });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      result: newRaw,
      status: true,
      message: "Other Goods Inventory added successfully.",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: false,
      message: "Error occurred while adding Other Goods Inventory.",
      error: error.message,
    });
  }
});

export const UpdateOtherGoods = catchAsync(async (req, res, next) => {
  // Start a MongoDB session
  const session = await mongoose.startSession();
  // Start a transaction

  try {
    session.startTransaction();
    const authUserDetail = req.userDetails;
    const otherGoodsId = req.query.id;

    if (!otherGoodsId || !mongoose.Types.ObjectId.isValid(otherGoodsId)) {
      return res.status(400).json({
        result: [],
        status: false,
        message: otherGoodsId ? "Invalid other goods ID" : IdRequired,
      });
    }

    const prevData = await OtherGoodsModel.findById(otherGoodsId).session(
      session
    );

    const { _id, ...consumedData } = {
      ...req.body,
      created_employee_id: authUserDetail._id,
    };

    const updated_available_quantity = parseFloat(
      (prevData?.available_quantity - req.body?.consumption_quantity)?.toFixed(
        2
      )
    );

    if (updated_available_quantity < 0) {
      return next(new ApiError("Other Goods Not Updated, Check Data", 400));
    }

    const otherGoods = await OtherGoodsModel.findByIdAndUpdate(
      otherGoodsId,
      {
        $set: {
          available_quantity: updated_available_quantity,
          updated_at: Date.now(),
        },
      },
      { new: true, runValidators: true, session }
    );

    if (!otherGoods) {
      return res.status(404).json({
        status: false,
        message: "Other goods not found.",
      });
    }

    const consumption = new OtherGoodsConsumedModel({
      ...consumedData,
      available_quantity: updated_available_quantity,
    });
    
    const savedConsumption = await consumption.save({ session });

    // if (updated_available_quantity === 0) {
    //   const deleteInventory = await OtherGoodsModel.findByIdAndDelete(
    //     otherGoodsId
    //   ).session(session);
    // }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      result: otherGoods,
      status: true,
      message: "Other goods updated successfully",
    });
  } catch (error) {
    // Rollback the transaction if there is any error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: error.message });
  }
});

export const FetchOtherGoods = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
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
    matchQuery["date_of_inward"] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await OtherGoodsModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
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
        [sortBy]: sort == "desc" ? -1 : 1,
      },
    },
    {
      $count: "totalDocuments",
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  const otherGoodsData = await OtherGoodsModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
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
        [sortBy]: sort == "desc" ? -1 : 1,
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
    result: otherGoodsData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const FetchOtherGoodsConsumption = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const { page, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;
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
    matchQuery["date_of_consumption"] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await OtherGoodsConsumedModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
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
        [sortBy]: sort == "desc" ? -1 : 1,
      },
    },
    {
      $count: "totalDocuments",
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  const otherGoodsData = await OtherGoodsConsumedModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "created_employee_id",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: "created_employee_id",
      },
    },
    {
      $unwind: {
        path: "$created_employee_id",
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
        [sortBy]: sort == "desc" ? -1 : 1,
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
    result: otherGoodsData,
    statusCode: 200,
    status: "success",
    totalPages: totalPages,
  });
});

export const EditOtherGoods = catchAsync(async (req, res, next) => {
  const { itemId } = req.query;
  const updates = req.body; // Request body containing the updates

  // Find the item by ID and update it
  const updatedItem = await OtherGoodsModel.findByIdAndUpdate(itemId, updates, {
    new: true,
  });

  if (!updatedItem) {
    return res.status(404).json({ error: "Item not found" });
  }

  res.status(200).json({
    result: updatedItem,
    statusCode: 200,
    status: "success",
  });
});
