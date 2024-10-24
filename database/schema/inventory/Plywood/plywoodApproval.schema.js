import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { plywood_invoice_schema, item_details_schema } from "./plywood.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const plywood_approval_item_details_schema = new mongoose.Schema(item_details_schema);
// plywood_approval_item_details_schema.add(approvalSchema)

plywood_approval_item_details_schema.index({ item_sr_no: 1 });
plywood_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const plywood_approval_invoice_schema = new mongoose.Schema(plywood_invoice_schema);
plywood_approval_invoice_schema.add(approvalSchema)

plywood_approval_invoice_schema.index({ inward_sr_no: 1 });

export const plywood_approval_inventory_items_model = mongoose.model(
  "plywood_approval_inventory_items_details",
  plywood_approval_item_details_schema
);
export const plywood_approval_inventory_invoice_model = mongoose.model(
  "plywood_approval_inventory_invoice_details",
  plywood_approval_invoice_schema
);

const plywood_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const plywood_approval_inventory_items_view_model = mongoose.model(
  "plywood_approval_inventory_items_view",
  plywood_approval_inventory_items_view_schema
);

(async function () {
  await plywood_approval_inventory_items_view_model.createCollection({
    viewOn: "plywood_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "plywood_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "plywood_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$plywood_invoice_details",
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
