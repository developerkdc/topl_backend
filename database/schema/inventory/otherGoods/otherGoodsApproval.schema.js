import mongoose from "mongoose";
import invoice_details from "../../../Utils/invoiceDetails.schema.js";
import { issues_for_status } from "../../../Utils/constants/constants.js";
import expensesSchema from "../../masters/expenses.schema.js";
// import { otherGoods_invoice_schema, item_details_schema } from "./otherGoods.schema.js";
import approvalSchema from "../../../Utils/approval.schema.js";
import { item_details_schema, othergoods_invoice_schema } from "./otherGoodsNew.schema.js";

const otherGoods_approval_item_details_schema = new mongoose.Schema(item_details_schema);
// otherGoods_approval_item_details_schema.add(approvalSchema)

otherGoods_approval_item_details_schema.index({ item_sr_no: 1 });
otherGoods_approval_item_details_schema.index(
  { item_sr_no: 1, invoice_id: 1 },
  { unique: true }
);

const otherGoods_approval_invoice_schema = new mongoose.Schema(othergoods_invoice_schema);
otherGoods_approval_invoice_schema.add(approvalSchema)

otherGoods_approval_invoice_schema.index({ inward_sr_no: 1 });

export const otherGoods_approval_inventory_items_model = mongoose.model(
  "otherGoods_approval_inventory_items_details",
  otherGoods_approval_item_details_schema
);
export const otherGoods_approval_inventory_invoice_model = mongoose.model(
  "otherGoods_approval_inventory_invoice_details",
  otherGoods_approval_invoice_schema
);

const otherGoods_approval_inventory_items_view_schema = new mongoose.Schema(
  {},
  {
    strict: false,
    autoCreate: false,
    autoIndex: false,
  }
);

export const otherGoods_approval_inventory_items_view_model = mongoose.model(
  "otherGoods_approval_inventory_items_view",
  otherGoods_approval_inventory_items_view_schema
);

(async function () {
  await otherGoods_approval_inventory_items_view_model.createCollection({
    viewOn: "otherGoods_approval_inventory_items_details",
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: "otherGoods_approval_inventory_invoice_details",
          localField: "invoice_id",
          foreignField: "_id",
          as: "otherGoods_invoice_details",
        },
      },
      {
        $unwind: {
          path: "$otherGoods_invoice_details",
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
