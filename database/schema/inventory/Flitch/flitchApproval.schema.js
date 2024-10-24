import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { flitch_invoice_schema, item_details_schema } from "./flitch.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const flitch_approval_item_details_schema = new mongoose.Schema(item_details_schema);
// flitch_approval_item_details_schema.add(approvalSchema)

flitch_approval_item_details_schema.index({ item_sr_no: 1 });
flitch_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const flitch_approval_invoice_schema = new mongoose.Schema(flitch_invoice_schema);
flitch_approval_invoice_schema.add(approvalSchema)

flitch_approval_invoice_schema.index({ inward_sr_no: 1 });

export const flitch_approval_inventory_items_model = mongoose.model(
  "flitch_approval_inventory_items_details",
  flitch_approval_item_details_schema
);
export const flitch_approval_inventory_invoice_model = mongoose.model(
  "flitch_approval_inventory_invoice_details",
  flitch_approval_invoice_schema
);

const flitch_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const flitch_approval_inventory_items_view_model = mongoose.model(
  "flitch_approval_inventory_items_view",
  flitch_approval_inventory_items_view_schema
);

(async function () {
  await flitch_approval_inventory_items_view_model.createCollection({
    viewOn: "flitch_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "flitch_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "flitch_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$flitch_invoice_details",
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
