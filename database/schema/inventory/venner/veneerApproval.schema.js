import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";
import { veneer_invoice_schema, veneer_item_details_schema } from "./venner.schema.js";

const veneer_approval_item_details_schema = new mongoose.Schema(veneer_item_details_schema);
// veneer_approval_item_details_schema.add(approvalSchema)

veneer_approval_item_details_schema.index({ item_sr_no: 1 });
veneer_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const veneer_approval_invoice_schema = new mongoose.Schema(veneer_invoice_schema);
veneer_approval_invoice_schema.add(approvalSchema)

veneer_approval_invoice_schema.index({ inward_sr_no: 1 });

export const veneer_approval_inventory_items_model = mongoose.model(
  "veneer_approval_inventory_items_details",
  veneer_approval_item_details_schema
);
export const veneer_approval_inventory_invoice_model = mongoose.model(
  "veneer_approval_inventory_invoice_details",
  veneer_approval_invoice_schema
);

const veneer_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const veneer_approval_inventory_items_view_model = mongoose.model(
  "veneer_approval_inventory_items_view",
  veneer_approval_inventory_items_view_schema
);

(async function () {
  await veneer_approval_inventory_items_view_model.createCollection({
    viewOn: "veneer_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "veneer_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "veneer_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$veneer_invoice_details",
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
