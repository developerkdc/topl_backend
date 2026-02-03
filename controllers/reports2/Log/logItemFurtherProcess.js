import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_view_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { slicing_done_items_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import { process_done_items_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { tapping_done_items_details_model } from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { createLogItemFurtherProcessReportExcel } from '../../../config/downloadExcel/reports2/Log/logItemFurtherProcess.js';

/**
 * Log Item Further Process Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of individual logs
 * from inward receipt through all processing stages (crosscutting, flitching, slicing, 
 * dressing, dyeing, tapping/splicing, pressing)
 * Shows one row per log with item grouping
 * 
 * @route POST /api/V1/reports2/log/download-excel-log-item-further-process-report
 * @access Private
 */
export const LogItemFurtherProcessReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Log Item Further Process Report Request - Start Date:', startDate);
  console.log('Log Item Further Process Report Request - End Date:', endDate);
  console.log('Log Item Further Process Report Request - Filter:', filter);

  // Validate required parameters
  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include full end date

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  // Build filter for item_name if provided
  const itemFilter = {};
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    // Step 1: Get all logs received during the period with invoice details
    const logsInPeriod = await log_inventory_items_view_model.aggregate([
      {
        $match: {
          ...itemFilter,
          'log_invoice_details.inward_date': { $gte: start, $lte: end },
        },
      },
      {
        $sort: {
          item_name: 1,
          log_no: 1,
        },
      },
    ]);

    if (logsInPeriod.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No log data found for the selected period'
          )
        );
    }

    // Step 2: For each log, calculate all metrics across all processing stages
    const logDataWithMetrics = await Promise.all(
      logsInPeriod.map(async (log) => {
        const logNo = log.log_no;
        const itemName = log.item_name;

        // ==== INWARD DETAILS ====
        const indianCmt = log.indian_cmt || 0;
        const receivedCmt = log.physical_cmt || 0;

        // ==== CROSS CUT DETAILS ====
        // Get crosscut received data for this log
        const crosscutData = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
            },
          },
          {
            $group: {
              _id: null,
              cc_rece: { $sum: '$crosscut_cmt' },
            },
          },
        ]);
        const ccRece = crosscutData[0]?.cc_rece || 0;

        // Calculate inward stock (this will be available CMT in round logs)
        const inwardTotalStock = receivedCmt;

        // ==== FLITCHING DETAILS ====
        // Get flitching data for this log
        const flitchingData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
            },
          },
          {
            $group: {
              _id: null,
              flitch_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);
        const flitchCmt = flitchingData[0]?.flitch_cmt || 0;

        // ==== SLICING DETAILS ====
        // Get slicing received data for this log (from crosscut or flitch)
        const slicingData = await slicing_done_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
            },
          },
          {
            $group: {
              _id: null,
              slice_rece: { $sum: '$natural_cmt' },
              issued_for_dressing: {
                $sum: {
                  $cond: [
                    { $eq: ['$issued_for_dressing', true] },
                    '$natural_cmt',
                    0,
                  ],
                },
              },
              // Note: issued for dyeing is tracked via dressing, not directly from slicing
            },
          },
        ]);
        const sliceRece = slicingData[0]?.slice_rece || 0;
        const sliceDress = slicingData[0]?.issued_for_dressing || 0;
        const sliceDye = 0; // Items typically go to dressing first, then dyeing
        const sliceTotalIssue = sliceDress + sliceDye;
        const sliceTotalStock = sliceRece - sliceTotalIssue;

        // ==== DRESSING DETAILS ====
        // Get dressing received data for this log
        const dressingData = await dressing_done_items_model.aggregate([
          {
            $match: {
              log_no_code: logNo,
              deleted_at: null,
            },
          },
          {
            $group: {
              _id: null,
              dress_rece: { $sum: '$natural_sqm' },
              issued_for_smoking_dying: {
                $sum: {
                  $cond: [
                    { $eq: ['$issue_status', 'smoking_dying'] },
                    '$natural_sqm',
                    0,
                  ],
                },
              },
              issued_for_grouping: {
                $sum: {
                  $cond: [
                    { $eq: ['$issue_status', 'grouping'] },
                    '$natural_sqm',
                    0,
                  ],
                },
              },
            },
          },
        ]);
        const dressRece = dressingData[0]?.dress_rece || 0;
        const dressDye = dressingData[0]?.issued_for_smoking_dying || 0;
        const dressClipp = 0; // Clipping may be part of another process
        const dressMixMatch = 0; // Mix match needs clarification
        const dressTotalIssue = dressDye + dressClipp + dressMixMatch + (dressingData[0]?.issued_for_grouping || 0);
        const dressTotalStock = dressRece - dressTotalIssue;

        // ==== DYEING (SMOKING/DYING) DETAILS ====
        // Get dyeing data for this log
        const dyeingData = await process_done_items_details_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
            },
          },
          {
            $group: {
              _id: null,
              dye_rece: { $sum: '$natural_sqm' },
              issued_for_grouping: {
                $sum: {
                  $cond: [
                    { $eq: ['$issue_status', 'grouping'] },
                    '$natural_sqm',
                    0,
                  ],
                },
              },
            },
          },
        ]);
        const dyeRece = dyeingData[0]?.dye_rece || 0;
        const dyeTotalIssue = dyeingData[0]?.issued_for_grouping || 0;
        const dyeTotalStock = dyeRece - dyeTotalIssue;

        // ==== TAPPING/SPLICING DETAILS ====
        // Get tapping data - includes machine splicing, hand splicing, and end tapping
        const tappingData = await tapping_done_items_details_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
            },
          },
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
          {
            $group: {
              _id: null,
              machine_splicing_rece: {
                $sum: {
                  $cond: [
                    { $eq: ['$tapping_details.splicing_type', 'MACHINE SPLICING'] },
                    '$natural_sqm',
                    0,
                  ],
                },
              },
              hand_splicing_rece: {
                $sum: {
                  $cond: [
                    { $eq: ['$tapping_details.splicing_type', 'HAND SPLICING'] },
                    '$natural_sqm',
                    0,
                  ],
                },
              },
              end_tapping_rece: {
                $sum: {
                  $cond: [
                    { $or: [
                      { $eq: ['$tapping_details.splicing_type', 'END TAPPING'] },
                      { $eq: ['$tapping_details.splicing_type', null] },
                    ]},
                    '$natural_sqm',
                    0,
                  ],
                },
              },
              total_rece: { $sum: '$natural_sqm' },
              issued_for_pressing: {
                $sum: {
                  $cond: [
                    { $eq: ['$issue_status', 'pressing'] },
                    '$natural_sqm',
                    0,
                  ],
                },
              },
            },
          },
        ]);
        const machineSplicingRece = tappingData[0]?.machine_splicing_rece || 0;
        const handSplicingRece = tappingData[0]?.hand_splicing_rece || 0;
        const endTappingRece = tappingData[0]?.end_tapping_rece || 0;
        const tappingTotalRece = tappingData[0]?.total_rece || 0;
        const tappingTotalIssue = tappingData[0]?.issued_for_pressing || 0;
        
        // Calculate clip issue (items issued from dyeing to tapping/splicing)
        const clipIssue = tappingTotalIssue;
        const clipRece = tappingTotalRece;
        const clipMSplic = machineSplicingRece;
        const clipHSplic = handSplicingRece;
        const clipTotalIssue = clipIssue;
        const clipTotalStock = clipRece - clipTotalIssue;

        // Machine splicing stock
        const machineSplicingTotalIssue = tappingData[0]?.issued_for_pressing || 0;
        const machineSplicingTotalStock = machineSplicingRece - machineSplicingTotalIssue;

        // Hand splicing stock
        const handSplicingTotalIssue = tappingData[0]?.issued_for_pressing || 0;
        const handSplicingTotalStock = handSplicingRece - handSplicingTotalIssue;

        // End tapping stock
        const endTappingTotalIssue = tappingData[0]?.issued_for_pressing || 0;
        const endTappingTotalStock = endTappingRece - endTappingTotalIssue;

        // Splicing (combined)
        const splicingTotalIssue = tappingTotalIssue;
        const splicingTotalStock = tappingTotalRece - splicingTotalIssue;

        // ==== PRESSING DETAILS ====
        // Get pressing data for this log
        const pressingData = await pressing_done_details_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
            },
          },
          {
            $group: {
              _id: null,
              pressing_rece: { $sum: '$natural_sqm' },
            },
          },
        ]);
        const pressingRece = pressingData[0]?.pressing_rece || 0;

        return {
          item_name: itemName,
          log_no: logNo,
          // Inward Details
          indian_cmt: indianCmt,
          rece: receivedCmt,
          inward_total_stock: inwardTotalStock,
          cc_rece: ccRece,
          saw: 0, // Sawing data needs clarification
          ue: 0, // UnEdge data needs clarification
          peel: 0, // Peeling from logs directly (if applicable)
          flitch: flitchCmt,
          crosscut_total_stock: ccRece,
          crosscut_total_issue: 0, // Items issued from crosscut
          crosscut_stock_after: ccRece,
          // Slicing
          slice_rece: sliceRece,
          slice_dress: sliceDress,
          slice_dye: sliceDye,
          slice_total_issue: sliceTotalIssue,
          slice_total_stock: sliceTotalStock,
          // Dressing
          dress_rece: dressRece,
          dress_clipp: dressClipp,
          dress_dye: dressDye,
          dress_mix_match: dressMixMatch,
          dress_total_issue: dressTotalIssue,
          dress_total_stock: dressTotalStock,
          // Dyeing
          dye_total_issue: dyeTotalIssue,
          dye_total_stock: dyeTotalStock,
          dye_rece: dyeRece,
          // Clip Issue
          clip_rece: clipRece,
          clip_msplic: clipMSplic,
          clip_hsplic: clipHSplic,
          clip_total_issue: clipTotalIssue,
          clip_total_stock: clipTotalStock,
          // Machine Splicing
          machine_splicing_rece: machineSplicingRece,
          machine_splicing_total_issue: machineSplicingTotalIssue,
          machine_splicing_total_stock: machineSplicingTotalStock,
          // Hand Splicing
          hand_splicing_rece: handSplicingRece,
          hand_splicing_total_issue: handSplicingTotalIssue,
          hand_splicing_total_stock: handSplicingTotalStock,
          // End Tapping
          end_tapping_rece: endTappingRece,
          end_tapping_total_issue: endTappingTotalIssue,
          end_tapping_total_stock: endTappingTotalStock,
          // Splicing
          splicing_total_issue: splicingTotalIssue,
          splicing_total_stock: splicingTotalStock,
          // Pressing
          pressing_rece: pressingRece,
        };
      })
    );

    // Step 3: Filter out logs with no activity (optional - keep all for now)
    const activeLogs = logDataWithMetrics;

    if (activeLogs.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No log data found for the selected period'
          )
        );
    }

    // Generate Excel file
    const excelLink = await createLogItemFurtherProcessReportExcel(
      activeLogs,
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
    console.error('Error generating log item further process report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
