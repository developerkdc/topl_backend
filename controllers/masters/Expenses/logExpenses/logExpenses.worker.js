import mongoose from 'mongoose';
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
} from '../../../../database/schema/inventory/log/log.schema.js';
import { issues_for_crosscutting_model } from '../../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import { crosscutting_done_model } from '../../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { parentPort, workerData } from 'worker_threads';
import mongo_service from '../../../../database/mongo.service.js';
import { issues_for_flitching_model } from '../../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { flitching_done_model } from '../../../../database/schema/factory/flitching/flitching.schema.js';
import { rejected_crosscutting_model } from '../../../../database/schema/factory/crossCutting/rejectedCrosscutting.schema.js';
mongo_service();

const processedExpense = async function () {
  const { invoice_id } = workerData;
  const invoiceDetails = await log_inventory_invoice_model.findOne({
    _id: new mongoose.Types.ObjectId(invoice_id),
  });
  if (!invoiceDetails) return;
  const invoiceAmount = invoiceDetails?.invoice_Details?.total_item_amount || 0;
  const totalExpenseAmount = invoiceDetails?.totalExpenseAmount || 0;

  const updateLogItemsExpenses = await log_inventory_items_model.aggregate([
    {
      $match: {
        invoice_id: new mongoose.Types.ObjectId(invoice_id),
      },
    },
    {
      $set: {
        amount_factor: {
          $round: [{ $divide: ['$amount', invoiceAmount] }, 2],
        },
        expense_amount: {
          $round: [
            {
              $multiply: [
                { $divide: ['$amount', invoiceAmount] },
                totalExpenseAmount,
              ],
            },
            2,
          ],
        },
      },
    },
    {
      $merge: {
        into: 'log_inventory_items_details',
        whenMatched: 'merge',
      },
    },
  ]);

  const logItemsExpenses = await log_inventory_items_model.aggregate([
    {
      $match: {
        invoice_id: new mongoose.Types.ObjectId(invoice_id),
      },
    },
  ]);

  if (!logItemsExpenses && logItemsExpenses?.length <= 0) return;

  for (let logItems of logItemsExpenses) {
    // loop through logitems
    const logItemId = logItems?._id;
    const issueForCrosscutting = await issues_for_crosscutting_model.findOne({
      log_inventory_item_id: logItemId,
    });
    if (issueForCrosscutting) {
      // check for isssue for cutting
      const available_expense_amount = Number(
        (
          issueForCrosscutting?.available_quantity?.sqm_factor *
          logItems?.expense_amount
        )?.toFixed(2)
      );
      await issues_for_crosscutting_model.updateOne(
        { _id: issueForCrosscutting?._id },
        {
          $set: {
            amount_factor: logItems?.amount_factor,
            expense_amount: logItems?.expense_amount,
            'available_quantity.expense_amount': available_expense_amount,
          },
        }
      );
      const crosscuttingDone = await crosscutting_done_model.find({
        issue_for_crosscutting_id: issueForCrosscutting?._id,
      });
      for (let crosscuttingDoneItem of crosscuttingDone) {
        // loop through crosscutting done and update the expense amount
        const crosscuttingDoneId = crosscuttingDoneItem?._id;
        const crosscutExpenseAmount = Number(
          (
            crosscuttingDoneItem?.sqm_factor * logItems?.expense_amount
          )?.toFixed(2)
        );
        await crosscutting_done_model.updateOne(
          { _id: crosscuttingDoneId },
          {
            $set: {
              expense_amount: crosscutExpenseAmount,
            },
          }
        );
        const issueForFlitching = await issues_for_flitching_model.findOne({
          crosscut_done_id: crosscuttingDoneId,
        });
        if (issueForFlitching) {
          // check for isssue for flitching
          const available_expense_amount = Number(
            (
              issueForFlitching?.available_quantity?.sqm_factor *
              crosscutExpenseAmount
            )?.toFixed(2)
          );
          await issues_for_flitching_model.updateOne(
            { crosscut_done_id: crosscuttingDoneId },
            {
              $set: {
                amount_factor: crosscuttingDoneItem?.sqm_factor,
                expense_amount: crosscutExpenseAmount,
                'available_quantity.expense_amount': available_expense_amount,
              },
            }
          );
          const flitchingDone = await flitching_done_model.find({
            issue_for_flitching_id: issueForFlitching?._id,
          });
          for (let flitchingDoneItem of flitchingDone) {
            // loop through crosscutting done and update the expense amount
            const expenseAmount = Number(
              (flitchingDoneItem?.sqm_factor * crosscutExpenseAmount)?.toFixed(
                2
              )
            );
            const updateExpenseInFlitchingDone =
              await flitching_done_model.updateOne(
                { _id: flitchingDoneItem?._id },
                {
                  $set: {
                    expense_amount: expenseAmount,
                  },
                }
              );
          }
        }
      }
      const rejected_crosscutting = await rejected_crosscutting_model.findOne({
        issue_for_crosscutting_id: issueForCrosscutting?._id,
      });
      if (rejected_crosscutting) {
        const available_expense_amount = Number(
          (
            rejected_crosscutting?.rejected_quantity?.sqm_factor *
            logItems?.expense_amount
          )?.toFixed(2)
        );
        await rejected_crosscutting_model.updateOne(
          { issue_for_crosscutting_id: issueForCrosscutting?._id },
          {
            $set: {
              amount_factor: logItems?.amount_factor,
              expense_amount: logItems?.expense_amount,
              'rejected_quantity.expense_amount': available_expense_amount,
            },
          }
        );
      }
    } else {
      const issueForFlitching = await issues_for_flitching_model.findOne({
        log_inventory_item_id: logItemId,
      });
      if (issueForFlitching) {
        // check for isssue for flitching
        const available_expense_amount = Number(
          (
            issueForFlitching?.available_quantity?.sqm_factor *
            logItems?.expense_amount
          )?.toFixed(2)
        );
        await issues_for_flitching_model.updateOne(
          { log_inventory_item_id: logItemId },
          {
            $set: {
              amount_factor: logItems?.amount_factor,
              expense_amount: logItems?.expense_amount,
              'available_quantity.expense_amount': available_expense_amount,
            },
          }
        );
        const flitchingDone = await flitching_done_model.find({
          issue_for_flitching_id: issueForFlitching?._id,
        });
        for (let flitchingDoneItem of flitchingDone) {
          // loop through crosscutting done and update the expense amount
          const expenseAmount = Number(
            (flitchingDoneItem?.sqm_factor * logItems?.expense_amount)?.toFixed(
              2
            )
          );
          const updateExpenseInFlitchingDone =
            await flitching_done_model.updateOne(
              { _id: flitchingDoneItem?._id },
              {
                $set: {
                  expense_amount: expenseAmount,
                },
              }
            );
        }
      }
    }
  }

  return 'Expenses has been distributed successfully';
};

processedExpense().then((result) => {
  parentPort.postMessage(result);
});
