import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { fleece_invoice_schema, fleece_item_details_schema } from "./fleece.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const fleece_approval_item_details_schema = new mongoose.Schema(fleece_item_details_schema);
// fleece_approval_item_details_schema.add(approvalSchema)

fleece_approval_item_details_schema.index({ item_sr_no: 1 });
fleece_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const fleece_approval_invoice_schema = new mongoose.Schema(fleece_invoice_schema);
fleece_approval_invoice_schema.add(approvalSchema)

fleece_approval_invoice_schema.index({ inward_sr_no: 1 });

export const fleece_approval_inventory_items_model = mongoose.model(
  "fleece_approval_inventory_items_details",
  fleece_approval_item_details_schema
);
export const fleece_approval_inventory_invoice_model = mongoose.model(
  "fleece_approval_inventory_invoice_details",
  fleece_approval_invoice_schema
);

const fleece_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const fleece_approval_inventory_items_view_model = mongoose.model(
  "fleece_approval_inventory_items_view",
  fleece_approval_inventory_items_view_schema
);

(async function () {
  await fleece_approval_inventory_items_view_model.createCollection({
    viewOn: "fleece_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "fleece_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "fleece_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$fleece_invoice_details",
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
