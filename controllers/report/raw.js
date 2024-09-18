import { GenerateIssueForDyingReport } from "../../config/downloadExcel/report/raw/issueForDying.js";
import { GenerateIssueForGroupingReport } from "../../config/downloadExcel/report/raw/issueForGrouping.js";
import { GenerateIssueForSmokingReport } from "../../config/downloadExcel/report/raw/issueForSmoking.js";
import { GenerateRawReport } from "../../config/downloadExcel/report/raw/rawVeneer.js";
import { IssuedForDyingIndividualModel } from "../../database/schema/dying/issuedForDyingIndividual.js";
import { IssuedForGroupingModel } from "../../database/schema/group/issueForGrouping/issueForGrouping.schema.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";
import { IssuedForSmokingIndividualModel } from "../../database/schema/smoking/issuedForSmokingIndividual.js";
import catchAsync from "../../utils/errors/catchAsync.js";

export const RawReportExcel = catchAsync(async (req, res, next) => {
  console.log(req?.body?.filters);
  const { sortBy = "updated_at", sort = "desc" } = req.query;
  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};
  if (to && from) {
    matchQuery["date_of_inward"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  const rawVeneerData = await RawMaterialModel.find({
    ...matchQuery,
  })
    .populate({
      path: "created_employee_id",
      select: "_id user_name first_name last_name",
    })
    .populate({
      path: "supplier_details.supplier_name",
    })
    .sort({ [sortBy]: sort })
    .exec();
  const exl = await GenerateRawReport(rawVeneerData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});

export const IssuedForSmokingRawReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = { ...data } || {};
    if (to && from) {
      matchQuery["created_at"] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }
    const rawVeneerData = await IssuedForSmokingIndividualModel.aggregate([
      {
        $lookup: {
          from: "raw_materials",
          localField: "item_id",
          foreignField: "_id",
          as: "item_id",
        },
      },
      {
        $unwind: {
          path: "$item_id",
          preserveNullAndEmptyArrays: true,
        },
      },
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
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
        },
      },
    ]);
    const exl = await GenerateIssueForSmokingReport(rawVeneerData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: "success",
    });
  }
);

export const IssuedForGroupingReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};
    if (to && from) {
      matchQuery["created_at"] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }
    const issuedForGroupingData = await IssuedForGroupingModel.aggregate([
      {
        $lookup: {
          from: "raw_materials",
          localField: "item_id",
          foreignField: "_id",
          as: "item_id",
        },
      },
      {
        $unwind: {
          path: "$item_id",
          preserveNullAndEmptyArrays: true,
        },
      },
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
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
        },
      },
    ]);
    const exl = await GenerateIssueForGroupingReport(issuedForGroupingData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: "success",
    });
  }
);

export const IssuedForDyingRawReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      matchQuery["created_at"] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }
    const rawVeneerData = await IssuedForDyingIndividualModel.aggregate([
      {
        $lookup: {
          from: "raw_materials",
          localField: "item_id",
          foreignField: "_id",
          as: "item_id",
        },
      },
      {
        $unwind: {
          path: "$item_id",
          preserveNullAndEmptyArrays: true,
        },
      },
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
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
        },
      },
    ]);
    const exl = await GenerateIssueForDyingReport(rawVeneerData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: "success",
    });
  }
);
