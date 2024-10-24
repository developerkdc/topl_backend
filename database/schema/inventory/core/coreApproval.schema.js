import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { core_invoice_schema, item_details_schema } from "./core.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const core_approval_item_details_schema = new mongoose.Schema(item_details_schema);
// core_approval_item_details_schema.add(approvalSchema)

core_approval_item_details_schema.index({ item_sr_no: 1 });
core_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const core_approval_invoice_schema = new mongoose.Schema(core_invoice_schema);
core_approval_invoice_schema.add(approvalSchema)

core_approval_invoice_schema.index({ inward_sr_no: 1 });

export const core_approval_inventory_items_model = mongoose.model(
  "core_approval_inventory_items_details",
  core_approval_item_details_schema
);
export const core_approval_inventory_invoice_model = mongoose.model(
  "core_approval_inventory_invoice_details",
  core_approval_invoice_schema
);

const core_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const core_approval_inventory_items_view_model = mongoose.model(
  "core_approval_inventory_items_view",
  core_approval_inventory_items_view_schema
);

(async function () {
  await core_approval_inventory_items_view_model.createCollection({
    viewOn: "core_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "core_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "core_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$core_invoice_details",
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
