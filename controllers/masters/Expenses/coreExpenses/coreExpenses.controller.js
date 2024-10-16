import mongoose from "mongoose";
import { core_inventory_invoice_details, core_inventory_items_details } from "../../../../database/schema/inventory/core/core.schema.js";
import { dynamic_filter } from "../../../../utils/dymanicFilter.js";
import { DynamicSearch } from "../../../../utils/dynamicSearch/dynamic.js";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import ApiError from "../../../../utils/errors/apiError.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import { StatusCodes } from "../../../../utils/constants.js";

export const coreExpenses_invoice_listing = catchAsync(async function (req, res, next) {
  const { page = 1, limit = 10, sortBy = "updatedAt", sort = "desc", search = "" } = req.query;
  const { string, boolean, numbers, arrayField = [] } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != "" && req?.body?.searchFields) {
    const search_data = DynamicSearch(search, boolean, numbers, string, arrayField);
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: "Results Not Found",
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  const aggregate_stage = [
    {
      $match: match_query,
    },
    {
      $sort: {
        [sortBy]: sort === "desc" ? -1 : 1,
        _id: sort === "desc" ? -1 : 1,
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ];

  const List_core_invoice_details = await core_inventory_invoice_details.aggregate(aggregate_stage);

  const totalCount = await core_inventory_invoice_details.countDocuments({
    ...match_query,
  });

  const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: List_core_invoice_details,
    totalPage: totalPage,
    message: "Data fetched successfully",
  });
});

export const coreExpenses_item_listing_by_invoice = catchAsync(async (req, res, next) => {
  const invoice_id = req.params.invoice_id;

  const aggregate_stage = [
    {
      $match: {
        invoice_id: new mongoose.Types.ObjectId(invoice_id),
      },
    },
    {
      $sort: {
        item_sr_no: 1,
      },
    },
  ];

  const coreExpense_item_by_invoice = await core_inventory_items_details.aggregate(aggregate_stage);
  const coreExpense_invoice = await core_inventory_invoice_details.findOne({ _id: invoice_id });

  // const totalCount = await core_inventory_items_view_model.countDocuments({
  //   ...match_query,
  // });

  // const totalPage = Math.ceil(totalCount / limit);

  return res.status(200).json({
    statusCode: 200,
    status: "success",
    data: {
      items: coreExpense_item_by_invoice,
      invoice: coreExpense_invoice,
    },
    // totalPage: totalPage,
    message: "Data fetched successfully",
  });
});

export const add_coreExpenses = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice_id = req.params?.invoice_id;
    const otherExpensesList = req.body?.otherExpensesList;
    const totalExpenseAmount = req.body?.totalExpenseAmount;
    if (!otherExpensesList && !Array.isArray(otherExpensesList)) return next(new ApiError("Expenses list must be array", 400));
    const invoiceDetails = await core_inventory_invoice_details.findOne({
      _id: new mongoose.Types.ObjectId(invoice_id),
    });
    if (!invoiceDetails) return next(new ApiError("Invoice not found", 404));
    const invoiceAmount = invoiceDetails?.invoice_Details?.total_item_amount || 0;

    const updateExpenseDetails = await core_inventory_invoice_details.updateOne(
      { _id: new mongoose.Types.ObjectId(invoice_id) },
      {
        $set: {
          expenses: otherExpensesList,
          totalExpenseAmount: totalExpenseAmount,
        },
      },
      { session }
    );

    if (!updateExpenseDetails?.acknowledged && updateExpenseDetails?.modifiedCount <= 0)
      return next(new ApiError("Failed to add expenses", 400));

    await session.commitTransaction();
    session.endSession();
    res.status(200).json(new ApiResponse(StatusCodes.OK, "Expenses Added successfully"));

    const updateCoreItemsExpenses = await core_inventory_items_details.aggregate([
      {
        $match: {
          invoice_id: new mongoose.Types.ObjectId(invoice_id),
        },
      },
      {
        $set: {
          amount_factor: {
            $divide: ["$amount", invoiceAmount],
          },
          expense_amount: {
            $multiply: [
              {
                $divide: ["$amount", invoiceAmount],
              },
              totalExpenseAmount,
            ],
          },
        },
      },
      {
        $merge: {
          into: "core_inventory_items_details",
          whenMatched: "merge",
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return next(error);
  }
});
