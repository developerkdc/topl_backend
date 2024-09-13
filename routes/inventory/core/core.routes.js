import express from "express";
import {
  add_core_inventory,
  add_single_core_item_inventory,
  edit_core_invoice_inventory,
  edit_core_item_inventory,
  listing_core_inventory,
} from "../../../controllers/inventory/core/core.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post("/list-inventory", CheckRoleAndTokenAccess, listing_core_inventory);
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

export default router;
