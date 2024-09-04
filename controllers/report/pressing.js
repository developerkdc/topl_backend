
import mongoose from "mongoose";
import catchAsync from "../../utils/errors/catchAsync.js";
import { GeneratePressingReport } from "../../config/downloadExcel/report/pressing/pressing.js";
import { GenerateIssuePressingReport } from "../../config/downloadExcel/report/pressing/issue_for_pressing.js";

export const PressingDoneReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = "updated_at", sort = "desc" } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {

    matchQuery["created_at"] = { $gte: new Date(from), $lte: new Date(to) };
  }

  const issuedForPressingView =
    mongoose.connection.db.collection("pressings_view");
  const issuedForPressingData = await issuedForPressingView
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
  const exl = await GeneratePressingReport(issuedForPressingData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});

export const IssuedForPressingReportExcel = catchAsync(async (req, res, next) => {
  const {
    sortBy = "updated_at",
    sort = "desc",
  } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery["created_at"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  const issuedForPressingView = mongoose.connection.db.collection(
    "issued_for_pressings_view"
  );
  const issuedForPressingData = await issuedForPressingView
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

  const exl = await GenerateIssuePressingReport(issuedForPressingData)
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});