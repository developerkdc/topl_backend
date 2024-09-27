import express from "express";
import {
  add_otherGoods_inventory,
  add_single_otherGoods_item_inventory,
  edit_otherGoods_invoice_inventory,
  edit_otherGoods_item_inventory,
  edit_othergoods_item_invoice_inventory,
  listing_otherGodds_inventory,
  othergoods_item_listing_by_invoice,
  otherGoodsLogsCsv,
} from "../../../controllers/inventory/otherGoods/otherGoods.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_otherGodds_inventory
);
router.post(
  "/add-inventory",
  CheckRoleAndTokenAccess,
  add_otherGoods_inventory
);
router.post(
  "/add-item-inventory",
  CheckRoleAndTokenAccess,
  add_single_otherGoods_item_inventory
);
router.patch(
  "/edit-item-inventory/:item_id",
  // CheckRoleAndTokenAccess,
  edit_otherGoods_item_inventory
);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  // CheckRoleAndTokenAccess,
  edit_otherGoods_invoice_inventory
);
router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  edit_othergoods_item_invoice_inventory
);
router.get(
  "/othergoods-item-listing-by-invoice/:invoice_id",
  othergoods_item_listing_by_invoice
);
router.post("/download-excel-othergoods-logs", otherGoodsLogsCsv);

export default router;
