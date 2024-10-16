import mongoose from "mongoose";
import { log_inventory_invoice_model, log_inventory_items_model } from "../../../../database/schema/inventory/log/log.schema.js";
import { issues_for_crosscutting_model } from "../../../../database/schema/factory/crossCutting/issuedForCutting.schema.js";
import { crosscutting_done_model } from "../../../../database/schema/factory/crossCutting/crosscutting.schema.js";
import { parentPort, workerData } from 'worker_threads';
import mongo_service from "../../../../database/mongo.service.js";
import { issues_for_flitching_model } from "../../../../database/schema/factory/flitching/issuedForFlitching.schema.js";
import { flitching_done_model } from "../../../../database/schema/factory/flitching/flitching.schema.js";
mongo_service();

const processedExpense = async function () {
    const { invoice_id } = workerData;
    const invoiceDetails = await log_inventory_invoice_model.findOne({ _id: new mongoose.Types.ObjectId(invoice_id) });
    if (!invoiceDetails) return;
    const invoiceAmount = invoiceDetails?.invoice_Details?.total_item_amount || 0;
    const totalExpenseAmount = invoiceDetails?.totalExpenseAmount || 0;

    const updateLogItemsExpenses = await log_inventory_items_model.aggregate([
        {
            $match: {
                invoice_id: new mongoose.Types.ObjectId(invoice_id)
            }
        },
        {
            $set: {
                amount_factor: {
                    $multiply: [
                        "$amount",
                        { $divide: [100, invoiceAmount] }
                    ]
                },
                expense_amount: {
                    $multiply: [
                        {
                            $multiply: [
                                "$amount",
                                { $divide: [100, invoiceAmount] }
                            ]
                        },
                        { $divide: [totalExpenseAmount, 100] }
                    ]
                }
            }
        },
        {
            $merge: {
                into: "log_inventory_items_details",
                whenMatched: "merge"
            }
        }
    ]);

    const logItemsExpenses = await log_inventory_items_model.aggregate([
        {
            $match: {
                invoice_id: new mongoose.Types.ObjectId(invoice_id)
            }
        }
    ]);

    if (!logItemsExpenses && logItemsExpenses?.length <= 0) return;

    for (let logItems of logItemsExpenses) { // loop through logitems
        const logItemId = logItems?._id
        await issues_for_crosscutting_model.updateOne({ log_inventory_item_id: logItemId }, {
            $set: {
                amount_factor: logItems?.amount_factor,
                expense_amount: logItems?.expense_amount,
            }
        })
        const issueForCrosscutting = await issues_for_crosscutting_model.findOne({ log_inventory_item_id: logItemId })
        if (issueForCrosscutting) { // check for isssue for cutting
            const crosscuttingDone = await crosscutting_done_model.find({ issue_for_crosscutting_id: issueForCrosscutting?._id });
            for (let crosscuttingDoneItem of crosscuttingDone) { // loop through crosscutting done and update the expense amount
                const expenseAmount = crosscuttingDoneItem?.sqm_factor * issueForCrosscutting?.expense_amount;
                const updateExpenseInCrosscuttingDone = await crosscutting_done_model.updateOne({ _id: crosscuttingDoneItem?._id }, {
                    $set: {
                        expense_amount: expenseAmount
                    }
                })
                const flitchingDone = await flitching_done_model.find({ crosscut_id: crosscuttingDoneItem?._id });
                for (let flitchingDoneItem of flitchingDone) { // loop through crosscutting done and update the expense amount
                    const flitchExpenseAmount = flitchingDoneItem?.sqm_factor * expenseAmount;
                    const updateExpenseInFlitchingDone = await flitching_done_model.updateOne({ _id: flitchingDoneItem?._id }, {
                        $set: {
                            expense_amount: flitchExpenseAmount
                        }
                    })
                }
            }
        } else {
            const issueForFlitching = await issues_for_flitching_model.findOne({ log_inventory_item_id: logItemId })
            await issues_for_flitching_model.updateOne({ log_inventory_item_id: logItemId }, {
                $set: {
                    amount_factor: logItems?.amount_factor,
                    expense_amount: logItems?.expense_amount,
                }
            });
            if (issueForFlitching) { // check for isssue for flitching
                const flitchingDone = await flitching_done_model.find({ issue_for_crosscutting_id: issueForCrosscutting?._id });
                for (let flitchingDoneItem of flitchingDone) { // loop through crosscutting done and update the expense amount
                    const expenseAmount = flitchingDoneItem?.sqm_factor * logItems?.expense_amount;
                    const updateExpenseInFlitchingDone = await flitching_done_model.updateOne({ _id: flitchingDoneItem?._id }, {
                        $set: {
                            expense_amount: expenseAmount
                        }
                    })
                }
            }
        }
    }

    return 'Expenses has been distributed successfully'
}

processedExpense().then((result) => {
    parentPort.postMessage(result)
})