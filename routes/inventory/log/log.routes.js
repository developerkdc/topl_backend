import { Router } from "express";
import {
  add_log_inventory,
  add_single_log_item_inventory,
  edit_log_invoice_inventory,
  edit_log_item_inventory,
  listing_log_inventory,
  logLogsCsv,
} from "../../../controllers/inventory/log/log.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();

router.post("/list-inventory", CheckRoleAndTokenAccess, listing_log_inventory);
router.post("/add-inventory", CheckRoleAndTokenAccess, add_log_inventory);
router.post("/add-item-inventory", add_single_log_item_inventory);
router.patch("/edit-item-inventory/:item_id", edit_log_item_inventory);
router.patch("/edit-invoice-inventory/:invoice_id", edit_log_invoice_inventory);
router.post("/download-excel-log-logs", logLogsCsv);

export default router;