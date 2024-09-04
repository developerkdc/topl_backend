import mongoose from "mongoose";

import catchAsync from "../../utils/errors/catchAsync.js";

import { GenerateFinishingReport } from "../../config/downloadExcel/report/finishing/finishing.js";
import { GenerateIssueFinishingReport } from "../../config/downloadExcel/report/finishing/issue_for_finishing.js";

export const FinishingDoneReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = "updated_at", sort = "desc" } = req.query;
  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    
    matchQuery["created_at"] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const issuedForFinishingView =
    mongoose.connection.db.collection("finishings_view");
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
  const exl = await GenerateFinishingReport(issuedForFinishingData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});

export const IssuedForFinishingReportExcel = catchAsync(async (req, res, next) => {
  const {
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    
    matchQuery["updated_at"] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const issuedForFinishingView = mongoose.connection.db.collection(
    "issued_for_finishings_view"
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

  const exl = await GenerateIssueFinishingReport(issuedForFinishingData)
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});