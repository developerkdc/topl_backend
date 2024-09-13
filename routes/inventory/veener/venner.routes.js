import { Router } from "express";
import {
  add_single_venner_item_inventory,
  add_venner_inventory,
  edit_venner_invoice_inventory,
  edit_venner_item_inventory,
  listing_venner_inventory,
} from "../../../controllers/inventory/venner/venner.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();
router.post(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_venner_inventory
);
router.post("/add-inventory", CheckRoleAndTokenAccess, add_venner_inventory);
router.post(
  "/add-item-inventory",
  CheckRoleAndTokenAccess,
  add_single_venner_item_inventory
);
router.patch(
  "/edit-item-inventory/:item_id",
  CheckRoleAndTokenAccess,
  edit_venner_item_inventory
);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_venner_invoice_inventory
);

export default router;
