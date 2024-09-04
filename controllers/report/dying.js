import { GenerateDyedGroupsReport } from "../../config/downloadExcel/report/dying/dyedGroup.js";
import { GenerateDyedIndividualReport } from "../../config/downloadExcel/report/dying/dyedIndividual.js";
import { GroupDyingModel } from "../../database/schema/dying/groupDying.js";
import { IndividualDyingModel } from "../../database/schema/dying/individualDying.js";
import catchAsync from "../../utils/errors/catchAsync.js";

export const DyedGroupReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = "updated_at", sort = "desc" } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery["date_of_dying"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  const rawVeneerData = await GroupDyingModel.aggregate([
    {
      $lookup: {
        from: "groups",
        localField: "group_id",
        foreignField: "_id",
        as: "group_id",
      },
    },
    {
      $unwind: {
        path: "$group_id",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_details",
        foreignField: "_id",
        as: "item_details",
      },
    },
    {
      $unwind: {
        path: "$group_id",
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
  const exl = await GenerateDyedGroupsReport(rawVeneerData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});


export const DyedIndividualReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = "updated_at", sort = "desc" } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery["date_of_dying"] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const rawVeneerData = await IndividualDyingModel.aggregate([
    {
      $lookup: {
        from: "raw_materials",
        localField: "item_details",
        foreignField: "_id",
        as: "item_details",
      },
    },
    {
      $unwind: {
        path: "$item_details",
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
  const exl = await GenerateDyedIndividualReport(rawVeneerData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});

