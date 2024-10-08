import { Router } from "express";
import {
  add_issue_for_crosscutting,
  add_issue_for_flitching,
  add_log_inventory,
  add_single_log_item_inventory,
  edit_log_invoice_inventory,
  edit_log_item_inventory,
  edit_log_item_invoice_inventory,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_log_history_inventory,
  listing_log_inventory,
  log_item_listing_by_invoice,
  logLogsCsv,
} from "../../../controllers/inventory/log/log.controller.js";

const router = Router();

router.post("/list-inventory", listing_log_inventory);
router.post("/list-history-inventory", listing_log_history_inventory);
router.post("/add-inventory", add_log_inventory);
router.post("/add-item-inventory", add_single_log_item_inventory);
router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  edit_log_item_invoice_inventory
);
router.patch("/edit-item-inventory/:item_id", edit_log_item_inventory);
router.patch("/edit-invoice-inventory/:invoice_id", edit_log_invoice_inventory);
router.post("/download-excel-log-logs", logLogsCsv);
router.get(
  "/log-item-listing-by-invoice/:invoice_id",
  log_item_listing_by_invoice
);

//dropdown
router.get("/item-srno-dropdown", item_sr_no_dropdown);
router.get("/inward-srno-dropdown", inward_sr_no_dropdown);

//Issue for crosscutting
router.post(
  "/issue_for_crosscutting",
  add_issue_for_crosscutting
);
router.post(
  "/issue_for_flitching",
  add_issue_for_flitching
);

export default router;
