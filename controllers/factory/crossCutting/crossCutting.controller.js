import mongoose from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import {
  issues_for_crosscutting_model,
  issues_for_crosscutting_view_model,
} from '../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import {
  crosscutting_done_model,
  crossCuttingsDone_view_modal,
} from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { StatusCodes } from '../../../utils/constants.js';
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from '../../../database/schema/inventory/log/log.schema.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { createCrosscuttingDoneExcel } from '../../../config/downloadExcel/Logs/Factory/crossCutting/index.js';
import { rejected_crosscutting_model } from '../../../database/schema/factory/crossCutting/rejectedCrosscutting.schema.js';
import { crosscutting_done_approval_model } from '../../../database/schema/factory/crossCutting/crosscuttingApproval.schema.js';

//Issue for crosscutting
export const listing_issue_for_crosscutting = catchAsync(
  async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sort = 'desc',
      search = '',
    } = req.query;
    const {
      string,
      boolean,
      numbers,
      arrayField = [],
    } = req?.body?.searchFields || {};
    const filter = req.body?.filter;

    let search_query = {};
    if (search != '' && req?.body?.searchFields) {
      const search_data = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );
      if (search_data?.length == 0) {
        return res.status(404).json({
          statusCode: 404,
          status: false,
          data: {
            data: [],
          },
          message: 'Results Not Found',
        });
      }
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
      ...filterData,
      ...search_query,
    };

    const aggregate_stage = [
      {
        $match: match_query,
      },
      {
        $match: {
          $or: [{ crosscutting_completed: false }, { is_rejected: false }],
          'available_quantity.physical_length': { $gt: 0 },
        },
      },
      {
        $sort: {
          [sortBy]: sort === 'desc' ? -1 : 1,
          _id: sort === 'desc' ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const issue_for_crosscutting_details =
      await issues_for_crosscutting_view_model.aggregate(aggregate_stage);

    const totalCountValue = await issues_for_crosscutting_view_model.aggregate([
      {
        $match: match_query,
      },
      {
        $match: {
          $or: [{ crosscutting_completed: false }, { is_rejected: false }],
          'available_quantity.physical_length': { $gt: 0 },
        },
      },
      {
        $count: 'totalCount',
      },
    ]);

    const totalCount = totalCountValue?.[0]?.totalCount || 0;
    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: issue_for_crosscutting_details,
      totalPage: totalPage,
      message: 'Data fetched successfully',
    });
  }
);

export const revert_issue_for_crosscutting = catchAsync(
  async function (req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const issue_for_crosscutting_id = req.params?.issue_for_crosscutting_id;
      const issue_for_crosscutting =
        await issues_for_crosscutting_model.findOne({
          _id: issue_for_crosscutting_id,
        });

      if (!issue_for_crosscutting)
        return next(new ApiError('Item not found', 400));
      if (
        issue_for_crosscutting?.available_quantity?.physical_length !==
        issue_for_crosscutting?.physical_length
      )
        return next(
          new ApiError(
            'Cannot revert because original length is not matched',
            400
          )
        );

      const update_log_item_status = await log_inventory_items_model.updateOne(
        { _id: issue_for_crosscutting?.log_inventory_item_id },
        {
          $set: {
            issue_status: null,
          },
        },
        { session }
      );

      if (
        !update_log_item_status.acknowledged ||
        update_log_item_status.modifiedCount <= 0
      )
        return next(new ApiError('unable to update status', 400));

      const deleted_issues_for_crosscutting =
        await issues_for_crosscutting_model.deleteOne(
          {
            _id: issue_for_crosscutting?._id,
          },
          { session }
        );

      if (
        !deleted_issues_for_crosscutting.acknowledged ||
        deleted_issues_for_crosscutting.deletedCount <= 0
      )
        return next(
          new ApiError('Unable to revert issue for crosscutting', 400)
        );

      // const issue_for_crosscutting_log_invoice_found =
      //   await issues_for_crosscutting_model.find({
      //     _id: { $ne: issue_for_crosscutting_id },
      //     invoice_id: issue_for_crosscutting?.invoice_id,
      //   });
      // const issue_for_crosscutting_flitching_log_invoice_found =
      //   await issues_for_flitching_model.find({
      //     invoice_id: issue_for_crosscutting?.invoice_id,
      //   });

      // if (
      //   issue_for_crosscutting_log_invoice_found?.length <= 0 &&
      //   issue_for_crosscutting_flitching_log_invoice_found?.length <= 0
      // ) {
      //   await log_inventory_invoice_model.updateOne(
      //     { _id: issue_for_crosscutting?.invoice_id },
      //     {
      //       $set: {
      //         isEditable: true,
      //       },
      //     },
      //     { session }
      //   );
      // } // previous logic

      const is_invoice_editable = await log_inventory_items_model.find({
        _id: { $ne: issue_for_crosscutting?.log_inventory_item_id }, // except that item
        invoice_id: issue_for_crosscutting?.invoice_id, // same invoice id
        issue_status: { $ne: null }, // is issued
      });

      //if is_invoice_editable found that means invoice for that item is issued somewhere
      if (is_invoice_editable && is_invoice_editable?.length <= 0) {
        await log_inventory_invoice_model.updateOne(
          { _id: issue_for_crosscutting?.invoice_id },
          {
            $set: {
              isEditable: true,
            },
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
      return res
        .status(200)
        .json(new ApiResponse(StatusCodes.OK, 'Reverted successfully'));
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);

export const addCrossCutDone = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  const userDetails = req.userDetails;
  session.startTransaction();
  const { available_data, newData } = req.body;

  try {
    const updated_items = newData?.map((item) => {
      item.created_by = userDetails?._id;
      return item;
    });
    const result = await crosscutting_done_model.insertMany(newData, {
      session,
    });

    if (result && result.length < 0) {
      return res.json(
        new ApiResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Err Inserting Crosscutiing Done Items...'
        )
      );
    }
    const {
      id,
      available_sqm,
      available_length,
      amount,
      crosscutting_completed,
      sqm_factor,
      expense_amount,
    } = available_data;

    await issues_for_crosscutting_model.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          'available_quantity.physical_cmt': available_sqm,
          'available_quantity.physical_length': available_length,
          'available_quantity.amount': amount,
          'available_quantity.sqm_factor': sqm_factor,
          'available_quantity.expense_amount': expense_amount,
          crosscutting_completed: crosscutting_completed,
        },
      },
      { session, new: true }
    );

    const issue_for_flitching_crosscut_done_found =
      await issues_for_flitching_model.find({
        issue_for_crosscutting_id: result?.[0]?.issue_for_crosscutting_id,
        crosscut_done_id: { $ne: null },
      });

    if (issue_for_flitching_crosscut_done_found?.length > 0) {
      await crosscutting_done_model.updateMany(
        {
          issue_for_crosscutting_id: result?.[0]?.issue_for_crosscutting_id,
        },
        {
          $set: {
            isEditable: false,
          },
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
    return res.json(
      new ApiResponse(StatusCodes.OK, 'Item Added Successfully', result)
    );
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

//Crosscutting done
export const listing_cross_cutting_inventory = catchAsync(
  async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sort = 'desc',
      search = '',
    } = req.query;
    const {
      string,
      boolean,
      numbers,
      arrayField = [],
    } = req?.body?.searchFields || {};
    const filter = req.body?.filter;

    let search_query = {};
    if (search != '' && req?.body?.searchFields) {
      const search_data = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );
      if (search_data?.length == 0) {
        return res.status(404).json({
          statusCode: 404,
          status: false,
          data: {
            data: [],
          },
          message: 'Results Not Found',
        });
      }
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
      ...filterData,
      ...search_query,
      issue_status: null,
    };

    const aggregate_stage = [
      {
        $match: match_query,
      },
      {
        $sort: {
          [sortBy]: sort === 'desc' ? -1 : 1,
          _id: sort === 'desc' ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const cross_cutting_done_list =
      await crossCuttingsDone_view_modal.aggregate(aggregate_stage);

    const totalCount = await crossCuttingsDone_view_modal.countDocuments({
      ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);

    return res.status(200).json({
      statusCode: 200,
      status: 'success',
      data: cross_cutting_done_list,
      totalPage: totalPage,
      message: 'Data fetched successfully',
    });
  }
);

export const add_cross_cutting_inventory = catchAsync(
  async (req, res, next) => {
    // const session = await mongoose.startSession();
    // session.startTransaction();
    // try {
    const issued_crosscutting_id = req.params?.issued_crosscutting_id;
    const crosscutting_details = req.body?.crosscutting_done_details;
    const is_crosscutting_completed =
      req.body?.is_crosscutting_completed || false;

    const issues_for_crosscutting_data =
      await issues_for_crosscutting_model.findOne({
        _id: issued_crosscutting_id,
      });
    if (!issues_for_crosscutting_data)
      return next(new ApiError('Invalid Issued crosscutting Id', 400));

    const crossCuttingLatestCode = await crosscutting_done_model.aggregate([
      {
        $match: {
          issue_for_crosscutting_id: new mongoose.Types.ObjectId(
            issued_crosscutting_id
          ),
        },
      },
      {
        $sort: {
          code: -1,
        },
      },
      {
        $project: {
          code: 1,
          issued_crosscutting_id: 1,
        },
      },
    ]);

    //Logic for autoincrement code
    const crosscuttingCode = crossCuttingLatestCode?.[0]?.code;
    let newCode = 'A';
    let newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
    let asciiCode = newCode?.charCodeAt();

    if (crosscuttingCode) {
      asciiCode = crosscuttingCode?.charCodeAt();
      asciiCode += 1;
      newCode = String.fromCharCode(asciiCode);
      newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
    }

    let issued_crosscuting_avaiable_physical_length =
      issues_for_crosscutting_data?.available_quantity?.physical_length;
    for (let crosscutting of crosscutting_details) {
      //Updating latest avaible physical length
      let crosscutting_done_length = crosscutting?.length;
      issued_crosscuting_avaiable_physical_length =
        issued_crosscuting_avaiable_physical_length - crosscutting_done_length;

      //Comparing avaible physical length should not be less then 0
      if (issued_crosscuting_avaiable_physical_length < 0)
        return next(new ApiError('Invaild input of length', 400));

      //insert crosscutting single item data
      const addCrosscutting = await crosscutting_done_model.create({
        ...crosscutting,
        // crosscut_date:new Date(crosscutting_details?.crosscut_date),
        code: newCode,
        log_no_code: newLogCode,
        issue_for_crosscutting_id: issues_for_crosscutting_data?._id,
        log_inventory_item_id:
          issues_for_crosscutting_data?.log_inventory_item_id,
        log_no: issues_for_crosscutting_data?.log_no,
      });

      //update avaible quantity of issue for crosscutting
      await issues_for_crosscutting_model.updateOne(
        { _id: issued_crosscutting_id },
        {
          $set: {
            'available_quantity.physical_length':
              issued_crosscuting_avaiable_physical_length,
            crosscutting_completed: is_crosscutting_completed,
          },
        }
      );

      asciiCode += 1;
      newCode = String.fromCharCode(asciiCode);
      newLogCode = `${issues_for_crosscutting_data?.log_no}${newCode}`;
    }

    //   await session.commitTransaction();
    //   session.endSession();
    return res
      .status(201)
      .json(
        new ApiResponse(StatusCodes.CREATED, 'Crosscutting done successfully')
      );
    // } catch (error) {
    //   console.log(error);
    //   await session.abortTransaction();
    //   session.endSession();
    //   return next(error);
    // }
  }
);

// export const revert_crosscutting_done = catchAsync(async function (req, res, next) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const crosscutting_done_id = req.params?.crosscutting_done_id;
//     const { isChecked } = req.body;
//     const crosscutting_done = await crosscutting_done_model.findOne({
//       _id: crosscutting_done_id,
//     }).lean();
//     if (!crosscutting_done) return next(new ApiError("Crosscutting Done Item not found", 400));

//     const issues_for_crosscutting_data = await issues_for_crosscutting_model.findOne({ _id: crosscutting_done?.issue_for_crosscutting_id }).lean()

//     if (issues_for_crosscutting_data) {
//       const { length, girth, crosscut_cmt, cost_amount } = crosscutting_done
//       const update_issues_for_crosscutting_item_quantity = await issues_for_crosscutting_model.updateOne(
//         { _id: issues_for_crosscutting_data?._id },
//         {
//           $set: {
//             is_rejected: false
//           },
//           $inc: {
//             "available_quantity.physical_length": length,
//             "available_quantity.physical_cmt": crosscut_cmt,
//             "available_quantity.amount": cost_amount,
//           },
//         },
//         { session }
//       );
//       if (
//         !update_issues_for_crosscutting_item_quantity.acknowledged ||
//         update_issues_for_crosscutting_item_quantity.modifiedCount <= 0
//       )
//         return next(new ApiError("unable to update status", 400));
//     }

//     const deleted_crosscutting_done =
//       await crosscutting_done_model.deleteOne(
//         {
//           _id: crosscutting_done_id,
//         },
//         { session }
//       );

//     if (
//       !deleted_crosscutting_done.acknowledged ||
//       deleted_crosscutting_done.deletedCount <= 0
//     )
//       return next(new ApiError("Unable to revert issue for crosscutting", 400));

//     await session.commitTransaction();
//     session.endSession();
//     return res
//       .status(200)
//       .json(new ApiResponse(StatusCodes.OK, "Reverted successfully"));
//   } catch (error) {
//     console.log(error);
//     await session.abortTransaction();
//     session.endSession();
//     return next(error);
//   }
// });

export const latest_crosscutting_code = catchAsync(
  async function (req, res, next) {
    const issued_crosscutting_id = req.params?.issued_crosscutting_id;

    const crossCuttingLatestCode = await crosscutting_done_model.aggregate([
      {
        $match: {
          issue_for_crosscutting_id: new mongoose.Types.ObjectId(
            issued_crosscutting_id
          ),
        },
      },
      {
        $sort: {
          code: -1,
        },
      },
      {
        $project: {
          code: 1,
          issued_crosscutting_id: 1,
        },
      },
    ]);

    const latestCode = crossCuttingLatestCode?.[0] || {
      code: null,
    };

    return res
      .status(201)
      .json(
        new ApiResponse(
          StatusCodes.CREATED,
          'Latest Crosscutting code',
          latestCode
        )
      );
  }
);

export const edit_cross_cutting_inventory = catchAsync(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const sendForApproval = req.sendForApproval;
      const user = req.userDetails;

      const { id } = req.params;
      const { available_data, newData } = req.body;

      let {
        available_sqm,
        available_length,
        amount,
        crosscutting_completed,
        sqm_factor,
        expense_amount,
      } = available_data;

      const rejected_data = await rejected_crosscutting_model.findOne({
        issue_for_crosscutting_id: id,
      });

      if (rejected_data) {
        available_length = Math.abs(
          available_length - rejected_data?.rejected_quantity?.physical_length
        );
        //  = Math.abs(available_length - rejected_data?.rejected_quantity?.physical_diameter);
        available_sqm = Math.abs(
          available_sqm - rejected_data?.rejected_quantity?.physical_cmt
        );
        amount = Math.abs(amount - rejected_data?.rejected_quantity?.amount);
        sqm_factor = Math.abs(
          sqm_factor - rejected_data?.rejected_quantity?.sqm_factor
        );
        expense_amount = Math.abs(
          expense_amount - rejected_data?.rejected_quantity?.expense_amount
        );
      }

      // logic if approval is not required
      if (!sendForApproval) {
        const all_invoice_items = await crosscutting_done_model.deleteMany(
          { issue_for_crosscutting_id: id },
          { session }
        );

        if (
          !all_invoice_items.acknowledged ||
          all_invoice_items.deletedCount <= 0
        ) {
          return next(new ApiError('Failed to update invoice items', 400));
        }

        for (let i = 0; i < newData.length; i++) {
          newData[i].approval_status = {
            sendForApproval: {
              status: false,
              remark: null,
            },
            approved: {
              status: false,
              remark: null,
            },
            rejected: {
              status: false,
              remark: null,
            },
          };
        }

        const update_item_details = await crosscutting_done_model.insertMany(
          [...newData],
          { session }
        );

        await issues_for_crosscutting_model.findOneAndUpdate(
          { _id: id },
          {
            $set: {
              'available_quantity.physical_cmt': available_sqm,
              'available_quantity.physical_length': available_length,
              'available_quantity.amount': amount,
              'available_quantity.sqm_factor': sqm_factor,
              'available_quantity.expense_amount': expense_amount,
              crosscutting_completed: crosscutting_completed,
              approval_status: {
                sendForApproval: {
                  status: false,
                  remark: null,
                },
                approved: {
                  status: false,
                  remark: null,
                },
                rejected: {
                  status: false,
                  remark: null,
                },
              },
            },
          },
          { session, new: true }
        );
        await session.commitTransaction();
        session.endSession();
        return res
          .status(StatusCodes.OK)
          .json(
            new ApiResponse(
              StatusCodes.OK,
              'Inventory item updated successfully',
              update_item_details
            )
          );
      } else {
        // logic if approval is required

        const edited_by = user?.id;
        const approval_person = user.approver_id;

        // creating id for unique identifier ID for items
        let unique_identifier_for_items = new mongoose.Types.ObjectId();

        const itemDetailsData = newData.map((ele) => {
          const { _id, createdAt, updatedAt, ...itemData } = ele;
          return {
            ...itemData,
            unique_identifier: unique_identifier_for_items,
            crosscutting_done_id: _id ? _id : new mongoose.Types.ObjectId(),
            issue_for_crosscutting_data: {
              physical_cmt: available_sqm,
              physical_length: available_length,
              amount: amount,
              sqm_factor: sqm_factor,
              expense_amount: expense_amount,
              crosscutting_completed: crosscutting_completed,
            },
            approval_status: {
              sendForApproval: {
                status: true,
                remark: 'Approval Pending',
              },
              approved: {
                status: false,
                remark: null,
              },
              rejected: {
                status: false,
                remark: null,
              },
            },
            approval: {
              editedBy: edited_by,
              approvalPerson: approval_person,
            },
          };
        });

        // add data in approval collection
        const add_approval_item_details =
          await crosscutting_done_approval_model.insertMany(itemDetailsData, {
            session,
          });

        if (!add_approval_item_details?.[0])
          return next(new ApiError('Failed to add invoice approval', 400));

        // update approval status in issue for crosscut collection
        await issues_for_crosscutting_model.findByIdAndUpdate(
          { _id: id },
          {
            $set: {
              approval_status: {
                sendForApproval: {
                  status: true,
                  remark: 'Approval Pending',
                },
                approved: {
                  status: false,
                  remark: null,
                },
                rejected: {
                  status: false,
                  remark: null,
                },
              },
            },
          },
          { session, new: true }
        );

        // update approval status in crosscut done collection
        await crosscutting_done_model.updateMany(
          { issue_for_crosscutting_id: id },
          {
            $set: {
              approval_status: {
                sendForApproval: {
                  status: true,
                  remark: 'Approval Pending',
                },
                approved: {
                  status: false,
                  remark: null,
                },
                rejected: {
                  status: false,
                  remark: null,
                },
              },
            },
          },
          { session, new: true }
        );

        await session.commitTransaction();
        session.endSession();
        return res
          .status(StatusCodes.OK)
          .json(
            new ApiResponse(
              StatusCodes.OK,
              'Inventory item send for approval successfully',
              add_approval_item_details
            )
          );
      }
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);

export const fetch_all_crosscuts_by_issue_for_crosscut_id = catchAsync(
  async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Issue for crosscut id is missing...'
      );
    }

    const pipeline = [
      {
        $match: {
          issue_for_crosscutting_id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $sort: { log_no_code: 1 },
      },
    ];

    const allDetails = await crossCuttingsDone_view_modal.aggregate(pipeline);

    if (allDetails.length === 0) {
      return res.json(
        new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, 'No Data Found....')
      );
    }
    return res.json(
      new ApiResponse(
        StatusCodes.OK,
        'All Crosscuts fetched successfully....',
        allDetails
      )
    );
  }
);

export const log_no_dropdown = catchAsync(async (req, res, next) => {
  const log_no = await crosscutting_done_model.distinct('log_no');
  return res.status(200).json({
    statusCode: 200,
    status: 'success',
    data: log_no,
    message: 'Log No Dropdown fetched successfully',
  });
});

export const revert_crosscutting_done = catchAsync(
  async function (req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const { isChecked } = req.body;
      // const issue_forCrossCutting = await issues_for_crosscutting_data.findOne({
      //   _id: id,
      // }).lean();
      const issues_for_crosscutting_data = await issues_for_crosscutting_model
        .findOne({ _id: id })
        .lean();
      if (!issues_for_crosscutting_data)
        return next(new ApiError('Crosscutting Done Item not found', 400));

      const rejected_data = await rejected_crosscutting_model.findOne({
        issue_for_crosscutting_id: id,
      });

      let updated_physical_length =
        issues_for_crosscutting_data?.physical_length;
      let updated_physical_diameter =
        issues_for_crosscutting_data?.physical_diameter;
      let updated_physical_cmt = issues_for_crosscutting_data?.physical_cmt;
      let updated_amount = issues_for_crosscutting_data?.amount;
      let updated_expense_amount = issues_for_crosscutting_data?.expense_amount;
      let updated_sqm_factor = issues_for_crosscutting_data?.sqm_factor;

      if (rejected_data) {
        updated_physical_length -=
          rejected_data?.rejected_quantity?.physical_length;
        updated_physical_diameter -=
          rejected_data?.rejected_quantity?.physical_diameter;
        updated_physical_cmt -= rejected_data?.rejected_quantity?.physical_cmt;
        updated_amount -= rejected_data?.rejected_quantity?.amount;
        updated_expense_amount -=
          rejected_data?.rejected_quantity?.expense_amount;
        updated_sqm_factor -= rejected_data?.rejected_quantity?.sqm_factor;
      }

      if (issues_for_crosscutting_data) {
        let updateData = {};

        // if (isChecked) {

        //   const {
        //     physical_length,
        //     physical_cmt,
        //     amount,
        //     expense_amount,
        //   } = issues_for_crosscutting_data;

        //   updateData = {
        //     $set: {
        //       crosscutting_completed: false,
        //       "available_quantity.sqm_factor": 1,
        //       "available_quantity.physical_length": physical_length,
        //       "available_quantity.physical_cmt": physical_cmt,
        //       "available_quantity.amount": amount,
        //       "available_quantity.expense_amount": expense_amount,
        //     },
        //   };
        // } else {
        //   const aggregatedTotal = await crosscutting_done_model.aggregate([
        //     {
        //       $match: {
        //         issue_for_crosscutting_id: new mongoose.Types.ObjectId(id)
        //       }
        //     },
        //     {
        //       $group: {
        //         _id: null,
        //         total_length: { $sum: { $add: ["$length", "$wastage_info.wastage_length"] } },
        //         sqm_factor: { $sum: "$sqm_factor" },
        //         // total_crosscut_cmt: { $sum: "$crosscut_cmt" },
        //         total_crosscut_cmt: { $sum: { $add: ["$crosscut_cmt", "$wastage_info.wastage_sqm"] } },
        //         total_cost_amount: { $sum: "$cost_amount" },
        //         total_expense_amount: { $sum: "$expense_amount" }
        //       }
        //     }
        //   ]);

        //   // Check if any aggregation result was returned
        //   const total = aggregatedTotal?.length > 0 ? aggregatedTotal[0] : {
        //     total_length: 0,
        //     sqm_factor: 0,
        //     total_crosscut_cmt: 0,
        //     total_cost_amount: 0,
        //     total_expense_amount: 0
        //   };

        //   updateData = {
        //     $set: {
        //       crosscutting_completed: false,
        //     },
        //     $inc: {
        //       "available_quantity.physical_length": total.total_length,
        //       "available_quantity.sqm_factor": total.sqm_factor,
        //       "available_quantity.physical_cmt": total.total_crosscut_cmt,
        //       "available_quantity.amount": total.total_cost_amount,
        //       "available_quantity.expense_amount": total.total_expense_amount,
        //     },
        //   };
        // }

        const update_issues_for_crosscutting_item_quantity =
          await issues_for_crosscutting_model.updateOne(
            { _id: issues_for_crosscutting_data?._id },
            {
              $set: {
                'available_quantity.physical_length': Number(
                  Number(updated_physical_length)?.toFixed(2)
                ),
                // "available_quantity.physical_diameter": updated_physical_diameter,
                'available_quantity.physical_cmt': Number(
                  Number(updated_physical_cmt)?.toFixed(3)
                ),
                'available_quantity.amount': Number(
                  Number(updated_amount)?.toFixed(2)
                ),
                'available_quantity.expense_amount': Number(
                  Number(updated_expense_amount)?.toFixed(2)
                ),
                crosscutting_completed: false,
                'available_quantity.sqm_factor': updated_sqm_factor,
              },
            },
            { session }
          );

        if (
          !update_issues_for_crosscutting_item_quantity.acknowledged ||
          update_issues_for_crosscutting_item_quantity.modifiedCount <= 0
        )
          return next(
            new ApiError('Unable to update available quantities', 400)
          );
      }

      const deleted_crosscutting_done =
        await crosscutting_done_model.deleteMany(
          { issue_for_crosscutting_id: id },
          { session }
        );

      if (
        !deleted_crosscutting_done.acknowledged ||
        deleted_crosscutting_done.deletedCount <= 0
      )
        return next(new ApiError('Unable to revert crosscutting item', 400));

      await session.commitTransaction();
      session.endSession();
      return res
        .status(200)
        .json(new ApiResponse(StatusCodes.OK, 'Reverted successfully'));
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      session.endSession();
      return next(error);
    }
  }
);

export const crossCuttingDoneExcel = catchAsync(async (req, res) => {
  const { search = '' } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
    issue_status: null,
  };

  const allData = await crosscutting_done_model.find(match_query);

  const excelLink = await createCrosscuttingDoneExcel(allData);
  console.log('link => ', excelLink);

  return res.json(
    new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...', excelLink)
  );
});

export const add_crosscut_issue_for_flitching = catchAsync(
  async (req, res, next) => {
    const crosscut_id = req.params?.crosscut_id;
    if (!crosscut_id) return next(new ApiError('crosscut id is required', 400));
    const created_by = req.userDetails.id; //extract userid from req.userDetails

    const crosscut_done_details = await crosscutting_done_model.findOne({
      _id: crosscut_id,
    });
    if (!crosscut_done_details)
      return next(new ApiError('Item not found', 404));

    const update_crosscut_done_status =
      await crosscutting_done_model.updateMany(
        { _id: crosscut_done_details?._id },
        {
          $set: {
            issue_status: issues_for_status.flitching,
          },
        }
      );

    if (
      !update_crosscut_done_status?.acknowledged &&
      update_crosscut_done_status.modifiedCount <= 0
    )
      return next(new ApiError('Failed to update', 400));

    const log_details = await log_inventory_items_model
      .findOne({
        _id: crosscut_done_details?.log_inventory_item_id,
        issue_status: issues_for_status.crosscutting,
      })
      .select({ created_by: 0, createdAt: 0, updatedAt: 0 })
      .lean();

    const issue_for_flitching = {
      log_inventory_item_id: crosscut_done_details?.log_inventory_item_id,
      issue_for_crosscutting_id:
        crosscut_done_details?.issue_for_crosscutting_id,
      crosscut_done_id: crosscut_done_details?._id,
      item_sr_no: log_details?.item_sr_no,
      supplier_item_name: log_details?.supplier_item_name,
      supplier_log_no: log_details?.supplier_log_no,
      item_id: log_details?.item_id,
      item_name: log_details?.item_name,
      item_sub_category_id: log_details?.item_sub_category_id,
      item_sub_category_name: log_details?.item_sub_category_name,
      log_no: crosscut_done_details?.log_no_code,
      log_formula: log_details?.log_formula,
      length: crosscut_done_details?.length,
      diameter: crosscut_done_details?.girth,
      cmt: crosscut_done_details?.crosscut_cmt,
      rate: crosscut_done_details?.per_cmt_cost,
      amount: crosscut_done_details?.cost_amount,
      amount_factor: crosscut_done_details?.amount_factor,
      expense_amount: crosscut_done_details?.expense_amount,
      issued_from: issues_for_status.crosscut_done,
      remark: crosscut_done_details?.remarks,
      invoice_id: log_details?.invoice_id,
      created_by: created_by,
      color: {
        color_id: crosscut_done_details?.color?.color_id,
        color_name: crosscut_done_details?.color?.color_name,
      },
    };

    const issue_for_flitching_data =
      await issues_for_flitching_model.create(issue_for_flitching);

    await crosscutting_done_model.updateMany(
      {
        issue_for_crosscutting_id:
          crosscut_done_details?.issue_for_crosscutting_id,
      },
      {
        $set: {
          isEditable: false,
        },
      }
    );

    return res.status(200).json(
      new ApiResponse(
        StatusCodes.CREATED,
        'Issue for flitching done successfully',
        {
          issue_for_flitching_data,
        }
      )
    );
  }
);

export const listing_crosscutting_done_history = catchAsync(
  async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sort = 'desc',
      search = '',
    } = req.query;
    const {
      string,
      boolean,
      numbers,
      arrayField = [],
    } = req?.body?.searchFields || {};
    const filter = req.body?.filter;

    let search_query = {};
    if (search != '' && req?.body?.searchFields) {
      const search_data = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );
      if (search_data?.length == 0) {
        return res.status(404).json({
          statusCode: 404,
          status: false,
          data: {
            data: [],
          },
          message: 'Results Not Found',
        });
      }
      search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
      ...filterData,
      ...search_query,
      issue_status: { $ne: null },
    };

    const aggregate_stage = [
      {
        $match: match_query,
      },
      {
        $sort: {
          [sortBy]: sort === 'desc' ? -1 : 1,
          _id: sort === 'desc' ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const list_crosscut_done_history =
      await crossCuttingsDone_view_modal.aggregate(aggregate_stage);

    const totalCount = await crossCuttingsDone_view_modal.countDocuments({
      ...match_query,
    });

    const totalPage = Math.ceil(totalCount / limit);
    const response = new ApiResponse(
      StatusCodes.OK,
      'Data Fetched Successfully',
      {
        data: list_crosscut_done_history,
        totalPages: totalPage,
      }
    );
    return res.status(200).json(response);
  }
);
