import express from "express";
import {
  add_core_inventory,
  add_single_core_item_inventory,
  core_item_listing_by_invoice,
  coreLogsCsv,
  edit_core_invoice_inventory,
  edit_core_item_inventory,
  edit_core_item_invoice_inventory,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_core_inventory,
} from "../../../controllers/inventory/core/core.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/list-inventory",
  // CheckRoleAndTokenAccess,
  listing_core_inventory
);
router.post("/add-inventory", CheckRoleAndTokenAccess, add_core_inventory);
router.post(
  "/add-item-inventory",
  // CheckRoleAndTokenAccess,
  add_single_core_item_inventory
);
router.patch(
  "/edit-item-inventory/:item_id",
  // CheckRoleAndTokenAccess,
  edit_core_item_inventory
);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  // CheckRoleAndTokenAccess,
  edit_core_invoice_inventory
);
router.get(
  "/core-item-listing-by-invoice/:invoice_id",
  core_item_listing_by_invoice
);
router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  edit_core_item_invoice_inventory
);
router.post("/download-excel-core", coreLogsCsv);

//dropdown
router.get("/item-srno-dropdown", item_sr_no_dropdown);
router.get("/inward-srno-dropdown", inward_sr_no_dropdown);
export default router;
