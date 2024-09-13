import { Router } from "express";
import {
  add_plywood_inventory,
  add_single_plywood_item_inventory,
  edit_plywood_invoice_inventory,
  edit_plywood_item_inventory,
  listing_plywood_inventory,
  plywoodLogsCsv,
} from "../../../controllers/inventory/plywood/plywood.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();

// router.post("/add-inventory", CheckRoleAndTokenAccess, add_plywood_inventory);
// router.patch(
//   "/edit-inventory/:item_id/:invoice_id",
//   CheckRoleAndTokenAccess,
//   edit_plywood_inventory
// );
// router.get(
//   "/list-inventory",
//   CheckRoleAndTokenAccess,
//   listing_plywood_inventory
// );
router.post(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_plywood_inventory
);
router.post("/add-inventory", CheckRoleAndTokenAccess, add_plywood_inventory);
router.post(
  "/add-item-inventory",
  CheckRoleAndTokenAccess,
  add_single_plywood_item_inventory
);
router.patch("/edit-item-inventory/:item_id", edit_plywood_item_inventory);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  edit_plywood_invoice_inventory
);
router.post("/download-excel-plywood-logs", plywoodLogsCsv);

export default router;
