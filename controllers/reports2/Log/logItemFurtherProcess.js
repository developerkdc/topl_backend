import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_view_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { slicing_done_items_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { peeling_done_items_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import { process_done_items_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import { tapping_done_items_details_model } from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { cnc_done_details_model } from '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js';
import { color_done_details_model } from '../../../database/schema/factory/colour/colour_done/colour_done.schema.js';
import { createLogItemFurtherProcessReportExcel } from '../../../config/downloadExcel/reports2/Log/logItemFurtherProcess.js';

// ─────────────────────────── Utility helpers ────────────────────────────────

const groupByKey = (arr, keyFn) => {
  const map = new Map();
  for (const item of arr) {
    const k = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (k == null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
};

const getVal = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);

const sumField = (arr, field) =>
  arr.reduce((acc, item) => acc + (parseFloat(getVal(item, field)) || 0), 0);

// Build regex pattern: code followed by one or more capital letters, end of string
// e.g. flitch_code "L0702A1" → /^L0702A1[A-Z]+$/
// Correctly distinguishes L0702A1A (matches) from L0702A10A (does NOT match for parent L0702A1
// because "10" has a digit after the base code)
const buildChildPattern = (code) => {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}[A-Z]+$`);
};

// Empty data for all columns from Grouping/Clipping onwards
const emptyDownstream = () => ({
  grouping_new_group_no: '',
  grouping_rec_sheets: '',
  grouping_rec_sqm: '',
  grouping_issue_sheets: '',
  grouping_issue_sqm: '',
  grouping_issue_status: '',
  grouping_balance_sheets: '',
  grouping_balance_sqm: '',
  splicing_rec_machine_sqm: '',
  splicing_rec_hand_sqm: '',
  splicing_sheets: '',
  splicing_issue_sheets: '',
  splicing_issue_status: '',
  splicing_balance_sheets: '',
  splicing_balance_sqm: '',
  pressing_sheets: '',
  pressing_sqm: '',
  pressing_issue_sheets: '',
  pressing_issue_sqm: '',
  pressing_issue_status: '',
  pressing_balance_sheets: '',
  pressing_balance_sqm: '',
  cnc_type: '',
  cnc_rec_sheets: '',
  colour_rec_sheets: '',
  sales_rec_sheets: '',
  jwc_veneer: '',
  awc_pressing_sheets: '',
});

const emptyFlitch = () => ({
  flitch_no: '',
  flitch_rec: '',
  flitch_issue_for: '',
  flitch_status: '',
});

const emptySlicing = () => ({
  slicing_side: '',
  slicing_process_cmt: '',
  slicing_balance_cmt: '',
  slicing_rec_leaf: '',
});

const emptyPeeling = () => ({
  peeling_process: '',
  peeling_balance_rostroller: '',
  peeling_output: '',
  peeling_rec_leaf: '',
});

const emptyDressing = () => ({
  dress_rec_sqm: '',
  dress_issue_sqm: '',
  dress_issue_status: '',
});

const emptySmoking = () => ({
  smoking_process: '',
  smoking_issue_sqm: '',
  smoking_issue_status: '',
});

// ─────────────────────── Grouping + downstream builder ──────────────────────

function buildGroupingData(
  groupItem,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId
) {
  const groupNo = groupItem.group_no;
  const recSheets = groupItem.no_of_sheets || 0;
  const recSqm = groupItem.sqm || 0;
  const availSheets =
    getVal(groupItem, 'available_details.no_of_sheets') ?? recSheets;
  const availSqm = getVal(groupItem, 'available_details.sqm') ?? recSqm;
  const issueSheets = Math.max(0, recSheets - availSheets);
  const issueSqm = Math.max(0, recSqm - availSqm);

  // Splicing / Tapping
  const tappingItems = tappingByGroupNo.get(groupNo) || [];
  const machineItems = tappingItems.filter(
    (t) => getVal(t, 'tapping_details.splicing_type') === 'MACHINE SPLICING'
  );
  const handItems = tappingItems.filter(
    (t) => getVal(t, 'tapping_details.splicing_type') === 'HAND SPLICING'
  );
  const machineSqm = sumField(machineItems, 'sqm');
  const handSqm = sumField(handItems, 'sqm');
  const splicingSheets = sumField(tappingItems, 'no_of_sheets');
  const splicingAvailSheets = sumField(
    tappingItems,
    'available_details.no_of_sheets'
  );
  const splicingAvailSqm = sumField(tappingItems, 'available_details.sqm');
  const splicingIssueSheets = Math.max(0, splicingSheets - splicingAvailSheets);
  const splicingIssueSqm = Math.max(
    0,
    sumField(tappingItems, 'sqm') - splicingAvailSqm
  );
  const splicingIssueStatus =
    tappingItems.find((t) => t.issued_for)?.issued_for || '';

  // Pressing
  const pressingItems = pressingByGroupNo.get(groupNo) || [];
  const pressingSheets = sumField(pressingItems, 'no_of_sheets');
  const pressingSqm = sumField(pressingItems, 'sqm');
  const pressingAvailSheets = sumField(
    pressingItems,
    'available_details.no_of_sheets'
  );
  const pressingAvailSqm = sumField(pressingItems, 'available_details.sqm');
  const pressingIssueSheets = Math.max(0, pressingSheets - pressingAvailSheets);
  const pressingIssueSqm = Math.max(0, pressingSqm - pressingAvailSqm);
  const pressingIssueStatus =
    pressingItems.find((p) => p.issued_for)?.issued_for || '';

  // CNC & Colour via pressing._id
  const pressingIds = pressingItems.map((p) => String(p._id));
  const cncItems = pressingIds.flatMap((id) => cncByPressingId.get(id) || []);
  const colourItems = pressingIds.flatMap(
    (id) => colourByPressingId.get(id) || []
  );
  const cncType = cncItems[0]?.product_type || '';
  const cncRecSheets = sumField(cncItems, 'no_of_sheets');
  const colourRecSheets = sumField(colourItems, 'no_of_sheets');

  return {
    grouping_new_group_no: groupNo,
    grouping_rec_sheets: recSheets || '',
    grouping_rec_sqm: recSqm || '',
    grouping_issue_sheets: issueSheets || '',
    grouping_issue_sqm: issueSqm || '',
    grouping_issue_status: '',
    grouping_balance_sheets: availSheets || '',
    grouping_balance_sqm: availSqm || '',
    splicing_rec_machine_sqm: machineSqm || '',
    splicing_rec_hand_sqm: handSqm || '',
    splicing_sheets: splicingSheets || '',
    splicing_issue_sheets: splicingIssueSheets || '',
    splicing_issue_status: splicingIssueStatus,
    splicing_balance_sheets: splicingAvailSheets || '',
    splicing_balance_sqm: splicingAvailSqm || '',
    pressing_sheets: pressingSheets || '',
    pressing_sqm: pressingSqm || '',
    pressing_issue_sheets: pressingIssueSheets || '',
    pressing_issue_sqm: pressingIssueSqm || '',
    pressing_issue_status: pressingIssueStatus,
    pressing_balance_sheets: pressingAvailSheets || '',
    pressing_balance_sqm: pressingAvailSqm || '',
    cnc_type: cncType,
    cnc_rec_sheets: cncRecSheets || '',
    colour_rec_sheets: colourRecSheets || '',
    sales_rec_sheets: '',
    jwc_veneer: '',
    awc_pressing_sheets: '',
  };
}

// ─────────────────────── Dressing + Smoking aggregators ─────────────────────

function getDressingData(logNoCode, dressingByCode) {
  const items = dressingByCode.get(logNoCode) || [];
  if (!items.length) return emptyDressing();
  return {
    dress_rec_sqm: sumField(items, 'sqm') || '',
    dress_issue_sqm: sumField(items.filter((d) => d.issue_status), 'sqm') || '',
    dress_issue_status: items.find((d) => d.issue_status)?.issue_status || '',
  };
}

function getSmokingData(logNoCode, smokingByCode) {
  const items = smokingByCode.get(logNoCode) || [];
  if (!items.length) return emptySmoking();
  return {
    smoking_process: items.map((s) => s.process_name).filter(Boolean)[0] || '',
    smoking_issue_sqm: sumField(items, 'sqm') || '',
    smoking_issue_status: items.find((s) => s.issue_status)?.issue_status || '',
  };
}

// ─────────────────────── Slicing side rows builder ──────────────────────────

function buildSlicingSideRows(
  logBase,
  ccBase,
  flitchBase,
  side,
  dressingByCode,
  smokingByCode,
  groupingByCode,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId
) {
  const sideCode = side.log_no_code;

  const slicingBase = {
    slicing_side: sideCode,
    slicing_process_cmt: '',
    slicing_balance_cmt: '',
    slicing_rec_leaf: side.no_of_leaves || '',
  };

  const dressingData = getDressingData(sideCode, dressingByCode);
  const smokingData = getSmokingData(sideCode, smokingByCode);
  const groupingItems = groupingByCode.get(sideCode) || [];

  if (groupingItems.length > 0) {
    return groupingItems.map((g) => ({
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...slicingBase,
      ...emptyPeeling(),
      ...dressingData,
      ...smokingData,
      ...buildGroupingData(
        g,
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId
      ),
    }));
  }

  return [
    {
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...slicingBase,
      ...emptyPeeling(),
      ...dressingData,
      ...smokingData,
      ...emptyDownstream(),
    },
  ];
}

// ─────────────────────── Peeling row builder ────────────────────────────────

function buildPeelingRow(
  logBase,
  ccBase,
  flitchBase,
  peel,
  dressingByCode,
  smokingByCode,
  groupingByCode,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId
) {
  const peelingCode = peel.log_no_code;

  const peelingData = {
    ...emptySlicing(),
    peeling_process: peel.output_type || '',
    peeling_balance_rostroller: '',
    peeling_output: peel.no_of_leaves || '',
    peeling_rec_leaf: peel.no_of_leaves || '',
  };

  const dressingData = getDressingData(peelingCode, dressingByCode);
  const smokingData = getSmokingData(peelingCode, smokingByCode);
  const groupingItems = groupingByCode.get(peelingCode) || [];

  const resolvedFlitch = flitchBase || emptyFlitch();

  if (groupingItems.length > 0) {
    return {
      ...logBase,
      ...ccBase,
      ...resolvedFlitch,
      ...peelingData,
      ...dressingData,
      ...smokingData,
      ...buildGroupingData(
        groupingItems[0],
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId
      ),
    };
  }

  return {
    ...logBase,
    ...ccBase,
    ...resolvedFlitch,
    ...peelingData,
    ...dressingData,
    ...smokingData,
    ...emptyDownstream(),
  };
}

// ─────────────────────── Flitch rows builder ────────────────────────────────

function buildFlitchRows(
  logBase,
  ccBase,
  flitch,
  slicingByLogNo,
  peelingByLogNo,
  dressingByCode,
  smokingByCode,
  groupingByCode,
  tappingByGroupNo,
  pressingByGroupNo,
  cncByPressingId,
  colourByPressingId
) {
  const flitchBase = {
    flitch_no: flitch.flitch_code,
    flitch_rec: flitch.flitch_cmt || '',
    flitch_issue_for: flitch.flitch_cmt || '',
    flitch_status: flitch.issue_status || '',
  };

  const childPattern = buildChildPattern(flitch.flitch_code);
  const allSlicingForLog = slicingByLogNo.get(logBase.log_no) || [];
  const slicingSides = allSlicingForLog.filter((s) =>
    childPattern.test(s.log_no_code)
  );

  const allPeelingForLog = peelingByLogNo.get(logBase.log_no) || [];
  const peelingForFlitch = allPeelingForLog.filter((p) =>
    childPattern.test(p.log_no_code)
  );

  const rows = [];

  for (const side of slicingSides) {
    rows.push(
      ...buildSlicingSideRows(
        logBase,
        ccBase,
        flitchBase,
        side,
        dressingByCode,
        smokingByCode,
        groupingByCode,
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId
      )
    );
  }

  for (const peel of peelingForFlitch) {
    rows.push(
      buildPeelingRow(
        logBase,
        ccBase,
        flitchBase,
        peel,
        dressingByCode,
        smokingByCode,
        groupingByCode,
        tappingByGroupNo,
        pressingByGroupNo,
        cncByPressingId,
        colourByPressingId
      )
    );
  }

  if (!rows.length) {
    // Flitch not yet processed further
    rows.push({
      ...logBase,
      ...ccBase,
      ...flitchBase,
      ...emptySlicing(),
      ...emptyPeeling(),
      ...emptyDressing(),
      ...emptySmoking(),
      ...emptyDownstream(),
    });
  }

  return rows;
}

// ─────────────────────── Main controller ────────────────────────────────────

/**
 * Inward Log Item Further Process Report
 * Hierarchical report tracking each log from inward through all processing
 * stages: CrossCut → Flitch → Slicing → Dressing → Smoking → Grouping →
 * Splicing → Pressing → CNC → Colour.
 * One row per leaf entity (grouping item / peeling item / slicing side).
 * Empty cells when a stage was not reached for that lineage.
 *
 * @route POST /api/V1/reports2/log/download-excel-log-item-further-process-report
 */
export const LogItemFurtherProcessReportExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate, filter = {} } = req.body;

    if (!startDate || !endDate) {
      return next(
        new ApiError('Start date and end date are required', 400)
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(
        new ApiError('Invalid date format. Use YYYY-MM-DD', 400)
      );
    }

    if (start > end) {
      return next(
        new ApiError('Start date cannot be after end date', 400)
      );
    }

    const itemFilter = {};
    if (filter.item_name) itemFilter.item_name = filter.item_name;
    if (filter.log_no) itemFilter.log_no = filter.log_no;
    if (filter.inward_id) {
      itemFilter['log_invoice_details.inward_sr_no'] = Number(filter.inward_id);
    }

    try {
      // ── Step 1: Fetch logs in the date range ─────────────────────────────
      const logs = await log_inventory_items_view_model.aggregate([
        {
          $match: {
            ...itemFilter,
            'log_invoice_details.inward_date': { $gte: start, $lte: end },
          },
        },
        { $sort: { item_name: 1, log_no: 1 } },
      ]);

      if (!logs.length) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              404,
              'No log data found for the selected period'
            )
          );
      }

      const logNos = [...new Set(logs.map((l) => l.log_no))];

      // ── Step 2: Bulk-fetch all processing stage data ──────────────────────
      const [crosscuts, flitches, slicingItems, peelingItems] =
        await Promise.all([
          crosscutting_done_model
            .find({ log_no: { $in: logNos }, deleted_at: null })
            .lean(),
          flitching_done_model
            .find({ log_no: { $in: logNos }, deleted_at: null })
            .lean(),
          slicing_done_items_model
            .find({ log_no: { $in: logNos } })
            .lean(),
          peeling_done_items_model
            .find({ log_no: { $in: logNos } })
            .lean(),
        ]);

      const allLeafCodes = [
        ...new Set([
          ...slicingItems.map((s) => s.log_no_code),
          ...peelingItems.map((p) => p.log_no_code),
        ]),
      ];

      const [dressingItems, smokingItems, groupingItems] =
        await Promise.all([
          allLeafCodes.length
            ? dressing_done_items_model
                .find({ log_no_code: { $in: allLeafCodes } })
                .lean()
            : [],
          allLeafCodes.length
            ? process_done_items_details_model
                .find({ log_no_code: { $in: allLeafCodes } })
                .lean()
            : [],
          allLeafCodes.length
            ? grouping_done_items_details_model
                .find({ log_no_code: { $in: allLeafCodes } })
                .lean()
            : [],
        ]);

      const groupNos = [
        ...new Set(groupingItems.map((g) => g.group_no)),
      ];

      const [tappingRaw, pressingItems] = await Promise.all([
        groupNos.length
          ? tapping_done_items_details_model.aggregate([
              { $match: { group_no: { $in: groupNos } } },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'tapping_details',
                },
              },
              {
                $unwind: {
                  path: '$tapping_details',
                  preserveNullAndEmptyArrays: true,
                },
              },
            ])
          : [],
        groupNos.length
          ? pressing_done_details_model
              .find({ group_no: { $in: groupNos } })
              .lean()
          : [],
      ]);

      const pressingIds = pressingItems.map((p) => p._id);
      const [cncItems, colourItems] = await Promise.all([
        pressingIds.length
          ? cnc_done_details_model
              .find({ pressing_details_id: { $in: pressingIds } })
              .lean()
          : [],
        pressingIds.length
          ? color_done_details_model
              .find({ pressing_details_id: { $in: pressingIds } })
              .lean()
          : [],
      ]);

      // ── Step 3: Build lookup maps ─────────────────────────────────────────
      const crosscutsByLogNo = groupByKey(crosscuts, 'log_no');
      const flitchesByCrosscutId = groupByKey(
        flitches.filter((f) => f.crosscut_done_id),
        (f) => String(f.crosscut_done_id)
      );
      const flitchesByLogNo = groupByKey(flitches, 'log_no');
      const slicingByLogNo = groupByKey(slicingItems, 'log_no');
      const peelingByLogNo = groupByKey(peelingItems, 'log_no');
      const dressingByCode = groupByKey(dressingItems, 'log_no_code');
      const smokingByCode = groupByKey(smokingItems, 'log_no_code');
      const groupingByCode = groupByKey(groupingItems, 'log_no_code');
      const tappingByGroupNo = groupByKey(tappingRaw, 'group_no');
      const pressingByGroupNo = groupByKey(pressingItems, 'group_no');
      const cncByPressingId = groupByKey(cncItems, (c) =>
        String(c.pressing_details_id)
      );
      const colourByPressingId = groupByKey(colourItems, (c) =>
        String(c.pressing_details_id)
      );

      // ── Step 4: Build flat hierarchical rows ──────────────────────────────
      const allRows = [];

      for (const log of logs) {
        const logNo = log.log_no;
        const logBase = {
          item_name: log.item_name || '',
          log_no: logNo,
          indian_cmt: log.indian_cmt ?? '',
          rece_cmt: log.physical_cmt ?? '',
          inward_issue_for: log.physical_cmt ?? '',
          inward_issue_status: log.issue_status || '',
        };

        const crosscutsForLog = crosscutsByLogNo.get(logNo) || [];
        const flitchesForLog = flitchesByLogNo.get(logNo) || [];
        const peelingForLog = peelingByLogNo.get(logNo) || [];

        if (crosscutsForLog.length > 0) {
          // Log went through crosscutting
          for (const cc of crosscutsForLog) {
            const ccBase = {
              cc_log_no: cc.log_no_code,
              cc_rec: cc.crosscut_cmt || '',
              cc_issue_for: cc.crosscut_cmt || '',
              cc_status: cc.issue_status || '',
            };

            const flitchesForCc =
              flitchesByCrosscutId.get(String(cc._id)) || [];

            if (flitchesForCc.length > 0) {
              for (const flitch of flitchesForCc) {
                allRows.push(
                  ...buildFlitchRows(
                    logBase,
                    ccBase,
                    flitch,
                    slicingByLogNo,
                    peelingByLogNo,
                    dressingByCode,
                    smokingByCode,
                    groupingByCode,
                    tappingByGroupNo,
                    pressingByGroupNo,
                    cncByPressingId,
                    colourByPressingId
                  )
                );
              }
            } else if (cc.issue_status === 'peeling') {
              // Crosscut went directly to peeling
              const ccPattern = buildChildPattern(cc.log_no_code);
              const peelingForCc = peelingForLog.filter((p) =>
                ccPattern.test(p.log_no_code)
              );

              if (peelingForCc.length > 0) {
                for (const peel of peelingForCc) {
                  allRows.push(
                    buildPeelingRow(
                      logBase,
                      ccBase,
                      null,
                      peel,
                      dressingByCode,
                      smokingByCode,
                      groupingByCode,
                      tappingByGroupNo,
                      pressingByGroupNo,
                      cncByPressingId,
                      colourByPressingId
                    )
                  );
                }
              } else {
                allRows.push({
                  ...logBase,
                  ...ccBase,
                  ...emptyFlitch(),
                  ...emptySlicing(),
                  ...emptyPeeling(),
                  ...emptyDressing(),
                  ...emptySmoking(),
                  ...emptyDownstream(),
                });
              }
            } else {
              // Crosscut not yet processed further
              allRows.push({
                ...logBase,
                ...ccBase,
                ...emptyFlitch(),
                ...emptySlicing(),
                ...emptyPeeling(),
                ...emptyDressing(),
                ...emptySmoking(),
                ...emptyDownstream(),
              });
            }
          }
        } else if (flitchesForLog.length > 0) {
          // Log went directly to flitching (no crosscut)
          const ccBase = {
            cc_log_no: '',
            cc_rec: '',
            cc_issue_for: '',
            cc_status: '',
          };
          for (const flitch of flitchesForLog) {
            allRows.push(
              ...buildFlitchRows(
                logBase,
                ccBase,
                flitch,
                slicingByLogNo,
                peelingByLogNo,
                dressingByCode,
                smokingByCode,
                groupingByCode,
                tappingByGroupNo,
                pressingByGroupNo,
                cncByPressingId,
                colourByPressingId
              )
            );
          }
        } else if (peelingForLog.length > 0) {
          // Log went directly to peeling (no crosscut, no flitch)
          const ccBase = {
            cc_log_no: '',
            cc_rec: '',
            cc_issue_for: '',
            cc_status: '',
          };
          for (const peel of peelingForLog) {
            allRows.push(
              buildPeelingRow(
                logBase,
                ccBase,
                null,
                peel,
                dressingByCode,
                smokingByCode,
                groupingByCode,
                tappingByGroupNo,
                pressingByGroupNo,
                cncByPressingId,
                colourByPressingId
              )
            );
          }
        } else {
          // No further processing recorded yet
          allRows.push({
            ...logBase,
            cc_log_no: '',
            cc_rec: '',
            cc_issue_for: '',
            cc_status: '',
            ...emptyFlitch(),
            ...emptySlicing(),
            ...emptyPeeling(),
            ...emptyDressing(),
            ...emptySmoking(),
            ...emptyDownstream(),
          });
        }
      }

      if (!allRows.length) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              404,
              'No log data found for the selected period'
            )
          );
      }

      const excelLink = await createLogItemFurtherProcessReportExcel(
        allRows,
        startDate,
        endDate,
        filter
      );

      return res.json(
        new ApiResponse(
          200,
          'Log item further process report generated successfully',
          excelLink
        )
      );
    } catch (error) {
      console.error(
        'Error generating log item further process report:',
        error
      );
      return next(
        new ApiError(error.message || 'Failed to generate report', 500)
      );
    }
  }
);
