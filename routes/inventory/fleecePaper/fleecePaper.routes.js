import express from "express";
import {
  add_fleecePaper_inventory,
  add_single_fleecePaper_item_inventory,
  edit_fleecePaper_invoice_inventory,
  edit_fleecePaper_item_inventory,
  listing_fleecePaper_inventory,
} from "../../../controllers/inventory/fleecePaper/fleecePaper.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();
router.post(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_fleecePaper_inventory
);
router.post(
  "/add-inventory",
  CheckRoleAndTokenAccess,
  add_fleecePaper_inventory
);
router.post(
  "/add-item-inventory",
  // CheckRoleAndTokenAccess,
  add_single_fleecePaper_item_inventory
);
router.patch(
  "/edit-item-inventory/:item_id",
  // CheckRoleAndTokenAccess,
  edit_fleecePaper_item_inventory
);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  // CheckRoleAndTokenAccess,
  edit_fleecePaper_invoice_inventory
);

export default router;
