import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
import { face_invoice_schema, item_details_schema } from "./face.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";

const face_approval_item_details_schema = new mongoose.Schema(item_details_schema);
// face_approval_item_details_schema.add(approvalSchema)

face_approval_item_details_schema.index({ item_sr_no: 1 });
face_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const face_approval_invoice_schema = new mongoose.Schema(face_invoice_schema);
face_approval_invoice_schema.add(approvalSchema)

face_approval_invoice_schema.index({ inward_sr_no: 1 });

export const face_approval_inventory_items_model = mongoose.model(
  "face_approval_inventory_items_details",
  face_approval_item_details_schema
);
export const face_approval_inventory_invoice_model = mongoose.model(
  "face_approval_inventory_invoice_details",
  face_approval_invoice_schema
);

const face_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const face_approval_inventory_items_view_model = mongoose.model(
  "face_approval_inventory_items_view",
  face_approval_inventory_items_view_schema
);

(async function () {
  await face_approval_inventory_items_view_model.createCollection({
    viewOn: "face_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "face_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "face_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$face_invoice_details",
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
