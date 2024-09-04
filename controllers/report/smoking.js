import { GenerateSmokedGroupsReport } from "../../config/downloadExcel/report/smoking/smokedGroup.js";
import { GenerateSmokedIndividualReport } from "../../config/downloadExcel/report/smoking/smokedIndividual.js";
import { GroupSmokeModel } from "../../database/schema/smoking/groupSmoked.js";
import { IndividualSmokeModel } from "../../database/schema/smoking/individualSmoked.js";
import catchAsync from "../../utils/errors/catchAsync.js";




export const SmokedGroupReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = "updated_at", sort = "desc" } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery["date_of_smoking"] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const rawVeneerData = await GroupSmokeModel.aggregate([
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

  const exl = await GenerateSmokedGroupsReport(rawVeneerData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: "success",
  });
});

export const SmokedIndividualReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = "updated_at", sort = "desc" } = req.query;
    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      console.log(new Date(from));
      matchQuery["date_of_smoking"] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }
    const rawVeneerData = await IndividualSmokeModel.aggregate([
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
    const exl = await GenerateSmokedIndividualReport(rawVeneerData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: "success",
    });
  }
);