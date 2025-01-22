import { GenerateDashboardReport } from '../../config/downloadExcel/report/dashboard.js';
import { CuttingModel } from '../../database/schema/cutting/cutting.js';
import { DispatchModel } from '../../database/schema/dispatch/dispatch.schema.js';
import { FinishingModel } from '../../database/schema/finishing/finishing.schema.js';
import { GroupModel } from '../../database/schema/group/groupCreated/groupCreated.schema.js';
import { PressingModel } from '../../database/schema/pressing/pressing.schema.js';
import { CreateTappingModel } from '../../database/schema/taping/taping.schema.js';
import { formatDate } from '../../utils/date/datebyYYMMDD.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const DashboardReportExcel = catchAsync(async (req, res, next) => {
  const { ...data } = req?.body?.filters || {};
  const { to, from } = req.query;
  const matchQuery = data || {};
  if (to && from) {
    const toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
    matchQuery['created_at'] = {
      $gte: new Date(from),
      $lte: toDate,
    };
  }
  const Group = await GroupModel.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalGroupPcs: { $sum: '$group_pcs' },
        totalGroupsqm: { $sum: '$group_sqm_available' },
      },
    },
  ]);
  const startDate = new Date(from);
  const endDate = new Date(to);
  const dateArray = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dateArray.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Map over date range and fill in missing dates
  const latsdata = dateArray.map((date) => {
    const formattedDate = date.toISOString().slice(0, 10);
    const match = Group.find((group) => group._id == formattedDate);
    return {
      _id: formattedDate,
      totalGroupPcs: match ? match.totalGroupPcs : 0,
      totalGroupsqm: match ? match.totalGroupsqm : 0,
    };
  });

  const Cutting = await CuttingModel.aggregate([
    { $match: matchQuery },
    {
      $unwind: '$item_details',
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalCuttingPcs: {
          $sum: '$item_details.cutting_no_of_pattas',
        },
        totalCuttingSqm: { $sum: '$item_details.cutting_sqm' },
      },
    },
  ]);

  const Tapping = await CreateTappingModel.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalTappingPcs: { $sum: '$tapping_no_of_pcs' },
        totalTappingSqm: { $sum: '$tapping_sqm' },
      },
    },
  ]);
  const Pressing = await PressingModel.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalPressingPcs: { $sum: '$pressing_no_of_peices' },
        totalPressingSqm: { $sum: '$pressing_sqm' },
      },
    },
  ]);
  const Finishing = await FinishingModel.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalFinishingPcs: { $sum: '$finishing_no_of_pcs' },
        totalFinishingSqm: { $sum: '$finishing_sqm' },
      },
    },
  ]);
  const DispatchGroup = await DispatchModel.aggregate([
    { $match: matchQuery },
    { $unwind: '$group_dispatch_details' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalDispatchGroupPcs: { $sum: '$group_dispatch_details.total_pcs' },
        totalDispatchGroupSqm: { $sum: '$group_dispatch_details.group_sqm' },
      },
    },
  ]);
  const DispatchRaw = await DispatchModel.aggregate([
    { $match: matchQuery },
    { $unwind: '$raw_dispatch_details' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        totalDispatchRawPcs: {
          $sum: '$raw_dispatch_details.total_pattas.total',
        },
        totalDispatchRawSqm: { $sum: '$raw_dispatch_details.item_sqm' },
      },
    },
  ]);

  const result = {
    sqm: [],
    pcs: [],
  };

  // Populate sqm data
  latsdata.forEach((groupData) => {
    const tappingData = Tapping.find((data) => data._id === groupData._id);
    const pressingData = Pressing.find((data) => data._id === groupData._id);
    const finishingData = Finishing.find((data) => data._id === groupData._id);
    const dispatchGroupData = DispatchGroup.find(
      (data) => data._id === groupData._id
    );
    const dispatchRawData = DispatchRaw.find(
      (data) => data._id === groupData._id
    );
    const CuttingData = Cutting.find((data) => data._id === groupData._id);
    const sqmData = {
      sqm_date: groupData._id,
      group_sqm: groupData.totalGroupsqm,
      tapping_sqm: tappingData ? tappingData.totalTappingSqm : 0,
      pressing_sqm: pressingData ? pressingData.totalPressingSqm : 0,
      finishing_sqm: finishingData ? finishingData.totalFinishingSqm : 0,
      dispatch_group_sqm: dispatchGroupData
        ? dispatchGroupData.totalDispatchGroupSqm
        : 0,
      dispatch_raw_sqm: dispatchRawData
        ? dispatchRawData.totalDispatchRawSqm
        : 0,
      cutting_sqm: CuttingData ? CuttingData.totalCuttingSqm : 0,
    };
    result.sqm.push(sqmData);
  });

  latsdata.forEach((groupData) => {
    const tappingData = Tapping.find((data) => data._id === groupData._id);
    const pressingData = Pressing.find((data) => data._id === groupData._id);
    const finishingData = Finishing.find((data) => data._id === groupData._id);
    const dispatchGroupData = DispatchGroup.find(
      (data) => data._id === groupData._id
    );
    const dispatchRawData = DispatchRaw.find(
      (data) => data._id === groupData._id
    );
    const CuttingData = Cutting.find((data) => data._id === groupData._id);

    const pscData = {
      pcs_date: groupData._id,
      group_pcs: groupData.totalGroupPcs,
      tapping_pcs: tappingData ? tappingData.totalTappingPcs : 0,
      pressing_pcs: pressingData ? pressingData.totalPressingPcs : 0,
      finishing_pcs: finishingData ? finishingData.totalFinishingPcs : 0,
      dispatch_group_pcs: dispatchGroupData
        ? dispatchGroupData.totalDispatchGroupPcs
        : 0,
      dispatch_raw_pcs: dispatchRawData
        ? dispatchRawData.totalDispatchRawPcs
        : 0,
      cutting_pcs: CuttingData ? CuttingData.totalCuttingPcs : 0,
    };
    result.pcs.push(pscData);
  });

  const exl = await GenerateDashboardReport(result);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: 'success',
  });
});
