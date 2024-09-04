import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import { GeneratePendingRawOrdersReport } from "../../config/downloadExcel/report/dispatch/pendingRawOrders.js";
import { GenerateDispatchedRawOrdersReport } from "../../config/downloadExcel/report/dispatch/dispatchedRawOrders.js";
import { GeneratePendingGroupOrdersReport } from "../../config/downloadExcel/report/dispatch/pendingGroupOrders.js";
import { GenerateCompleteRawOrdersReport } from "../../config/downloadExcel/report/dispatch/completeRawOrders.js";
import { GenerateCompleteGroupOrdersReport } from "../../config/downloadExcel/report/dispatch/completeGroupOrders.js";
import { GenerateDispatchedGroupDoneReport } from "../../config/downloadExcel/report/dispatch/dispatchedGroupDone.js";

export const DownloadPendingRawOrdersReport = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {

      matchQuery["orderDate"] = { $gte: new Date(from), $lte: new Date(to) };
    }
    const issuedForFinishingView = mongoose.connection.db.collection(
      "order_raw_pending_view"
    );

    const issuedForFinishingData = await issuedForFinishingView
      .aggregate([
        {
          $match: {
            ...matchQuery,
          },
        },
        {
          $sort: {
            [sortBy]: sort == "desc" ? -1 : 1,
          },
        },
      ])
      .toArray();
    const excel = await GeneratePendingRawOrdersReport(issuedForFinishingData);
    return res.status(200).json({
      result: excel,
      statusCode: 200,
      status: "success",
    });
  }
);

export const DownloadDispatchedRawOrdersReport = catchAsync(
  async (req, res, next) => {
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    if (to && from) {
    
      matchQuery["dispatched_date"] = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }
    const issuedForFinishingView =
      mongoose.connection.db.collection("dispatch_raw_view");

    const issuedForFinishingData = await issuedForFinishingView
      .aggregate([
        {
          $match: {
            ...matchQuery,
          },
        },
        {
          $sort: {
            [sortBy]: sort == "desc" ? -1 : 1,
          },
        },
      ])
      .toArray();
    const excel = await GenerateDispatchedRawOrdersReport(
      issuedForFinishingData
    );
    return res.status(200).json({
      result: excel,
      statusCode: 200,
      status: "success",
    });
  }
);

export const DownloadPendingGroupOrdersReport = catchAsync(
  async (req, res, next) => {
    const { to, from, ...data } = req?.body?.filters || {};
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const matchQuery = data || {};

    if (to && from) {
   
      matchQuery["orderDate"] = { $gte: new Date(from), $lte: new Date(to) };
    }
    const issuedForFinishingView = mongoose.connection.db.collection(
      "order_group_pending_view"
    );

    const issuedForFinishingData = await issuedForFinishingView
      .aggregate([
        {
          $match: {
            ...matchQuery,
          },
        },
        {
          $sort: {
            [sortBy]: sort == "desc" ? -1 : 1,
          },
        },
      ])
      .toArray();
    const excel = await GeneratePendingGroupOrdersReport(
      issuedForFinishingData
    );
    return res.status(200).json({
      result: excel,
      statusCode: 200,
      status: "success",
    });
  }
);

export const DownloadCompleteRawOrdersReport = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {

      matchQuery["orderDate"] = { $gte: new Date(from), $lte: new Date(to) };
    }
    const issuedForFinishingView = mongoose.connection.db.collection(
      "order_raw_complete_view"
    );

    const issuedForFinishingData = await issuedForFinishingView
      .aggregate([
        {
          $match: {
            ...matchQuery,
          },
        },
        {
          $sort: {
            [sortBy]: sort == "desc" ? -1 : 1,
          },
        },
      ])
      .toArray();
    const excel = await GenerateCompleteRawOrdersReport(issuedForFinishingData);
    return res.status(200).json({
      result: excel,
      statusCode: 200,
      status: "success",
    });
  }
);

export const DownloadCompleteGroupOrdersReport = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
     
      matchQuery["orderDate"] = { $gte: new Date(from), $lte: new Date(to) };
    }
    const issuedForFinishingView = mongoose.connection.db.collection(
      "order_group_complete_view"
    );

    const issuedForFinishingData = await issuedForFinishingView
      .aggregate([
        {
          $match: {
            ...matchQuery,
          },
        },
        {
          $sort: {
            [sortBy]: sort == "desc" ? -1 : 1,
          },
        },
      ])
      .toArray();
    const excel = await GenerateCompleteGroupOrdersReport(
      issuedForFinishingData
    );
    return res.status(200).json({
      result: excel,
      statusCode: 200,
      status: "success",
    });
  }
);

export const DispatchedGroupDoneReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {

      matchQuery["dispatched_date"] = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }
    const issuedForFinishingView = mongoose.connection.db.collection(
      "dispatch_group_view"
    );

    const issuedForFinishingData = await issuedForFinishingView
      .aggregate([
        {
          $match: {
            ...matchQuery,
          },
        },
        {
          $sort: {
            [sortBy]: sort == "desc" ? -1 : 1,
          },
        },
      ])
      .toArray();
    const exl = await GenerateDispatchedGroupDoneReport(issuedForFinishingData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: "success",
    });
  }
);
