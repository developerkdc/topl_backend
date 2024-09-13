import { Router } from "express";
import {
  add_mdf_inventory,
  add_single_mdf_item_inventory,
  edit_mdf_invoice_inventory,
  edit_mdf_item_inventory,
  listing_mdf_inventory,
  mdfLogsCsv,
} from "../../../controllers/inventory/mdf/mdf.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();

// router.post("/add-inventory", CheckRoleAndTokenAccess, add_mdf_inventory);
// router.patch(
//   "/edit-inventory/:item_id/:invoice_id",
//   CheckRoleAndTokenAccess,
//   edit_mdf_inventory
// );
// router.get("/list-inventory", CheckRoleAndTokenAccess, listing_mdf_inventory);

router.post("/list-inventory", CheckRoleAndTokenAccess, listing_mdf_inventory);
router.post("/add-inventory", CheckRoleAndTokenAccess, add_mdf_inventory);
router.post("/add-item-inventory", add_single_mdf_item_inventory);
router.patch("/edit-item-inventory/:item_id", edit_mdf_item_inventory);
router.patch("/edit-invoice-inventory/:invoice_id", edit_mdf_invoice_inventory);
router.post("/download-excel-mdf-logs", mdfLogsCsv);

export default router;
