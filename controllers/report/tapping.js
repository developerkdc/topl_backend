import { GenerateIssueTappingReport } from '../../config/downloadExcel/report/tapping/issueForTapping.js';
import { GenerateTappingReport } from '../../config/downloadExcel/report/tapping/tapping.js';
import { IssueForTapingModel } from '../../database/schema/taping/issuedTaping.schema.js';

import { CreateTappingModel } from '../../database/schema/taping/taping.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const TappingDoneReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = 'updated_at', sort = 'desc' } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['taping_done_date'] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const issuedForGroupingData = await CreateTappingModel.aggregate([
    {
      $lookup: {
        from: 'cuttings',
        localField: 'cutting_id',
        foreignField: '_id',
        pipeline: [
          {
            $unwind: '$item_details', // Unwind to access each item_detail individually
          },
          {
            $lookup: {
              from: 'raw_materials',
              localField: 'item_details.item_id',
              foreignField: '_id',
              as: 'item_details.item_data', // Populate item_data field with data from raw_materials
            },
          },
          {
            $group: {
              _id: '$_id',
              cutting_id: { $push: '$$ROOT' }, // Push back the modified cuttings documents into cutting_id array
            },
          },
        ],
        as: 'cutting_id',
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'cutting_id.cutting_id.group_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              group_no: 1,
            },
          },
        ],
        as: 'group_data',
      },
    },
    {
      $unwind: {
        path: '$group_data',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: 'created_employee_id',
      },
    },
    {
      $unwind: {
        path: '$created_employee_id',
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
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
  ]);
  const exl = await GenerateTappingReport(issuedForGroupingData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: 'success',
  });
});

export const IssuedForTappingReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = 'updated_at', sort = 'desc' } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    console.log(req?.body?.filters, 'req?.body?.filters');
    const matchQuery = data || {};

    console.log(matchQuery, 'matchQuery');
    if (to && from) {
      matchQuery['issued_for_taping_date'] = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const issuedForGroupingData = await IssueForTapingModel.aggregate([
      {
        $lookup: {
          from: 'cuttings',
          localField: 'cutting_id',
          foreignField: '_id',
          pipeline: [
            {
              $unwind: '$item_details', // Unwind to access each item_detail individually
            },
            {
              $lookup: {
                from: 'raw_materials',
                localField: 'item_details.item_id',
                foreignField: '_id',
                as: 'item_details.item_data', // Populate item_data field with data from raw_materials
              },
            },
            {
              $group: {
                _id: '$_id',
                cutting_id: { $push: '$$ROOT' }, // Push back the modified cuttings documents into cutting_id array
              },
            },
          ],
          as: 'cutting_id',
        },
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'cutting_id.cutting_id.group_id',
          foreignField: '_id',
          // pipeline: [
          //   {
          //     $project: {
          //       group_no: 1,
          //     },
          //   },
          // ],
          as: 'group_data',
        },
      },
      {
        $unwind: {
          path: '$group_data',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'created_employee_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                password: 0,
              },
            },
          ],
          as: 'created_employee_id',
        },
      },
      {
        $unwind: {
          path: '$created_employee_id',
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
          [sortBy]: sort == 'desc' ? -1 : 1,
        },
      },
    ]);
    const exl = await GenerateIssueTappingReport(issuedForGroupingData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: 'success',
    });
  }
);
