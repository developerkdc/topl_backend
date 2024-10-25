import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { log_invoice_schema, log_item_details_schema } from "./log.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const log_approval_item_details_schema = new mongoose.Schema(log_item_details_schema);
// log_approval_item_details_schema.add(approvalSchema)

log_approval_item_details_schema.index({ item_sr_no: 1 });
log_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 }
);

const log_approval_invoice_schema = new mongoose.Schema(log_invoice_schema);
log_approval_invoice_schema.add(approvalSchema)

log_approval_invoice_schema.index({ inward_sr_no: 1 });

export const log_approval_inventory_items_model = mongoose.model(
  "log_approval_inventory_items_details",
  log_approval_item_details_schema
);
export const log_approval_inventory_invoice_model = mongoose.model(
  "log_approval_inventory_invoice_details",
  log_approval_invoice_schema
);

const log_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const log_approval_inventory_items_view_model = mongoose.model(
  "log_approval_inventory_items_view",
  log_approval_inventory_items_view_schema
);

(async function () {
  await log_approval_inventory_items_view_model.createCollection({
    viewOn: "log_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "log_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "log_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$log_invoice_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "_id",
          as: "created_user",
        },
      },
      {
        $unwind: {
          path: "$created_user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();
