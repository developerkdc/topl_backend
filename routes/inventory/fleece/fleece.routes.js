import { Router } from "express";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
import {
  add_fleece_inventory,
  add_single_fleece_item_inventory,
  edit_fleece_invoice_inventory,
  edit_fleece_item_inventory,
  edit_fleece_item_invoice_inventory,
  fleece_item_listing_by_invoice,
  fleeceCsv,
  fleeceLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_fleece_inventory,
} from "../../../controllers/inventory/fleece/fleece.controller.js";

const fleece_router = Router();

fleece_router.post("/list-inventory", listing_fleece_inventory);
fleece_router.post(
  "/add-inventory",
  CheckRoleAndTokenAccess,
  add_fleece_inventory
);
fleece_router.post("/add-item-inventory", add_single_fleece_item_inventory);
fleece_router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  edit_fleece_item_invoice_inventory
);
fleece_router.patch(
  "/edit-item-inventory/:item_id",
  edit_fleece_item_inventory
);
fleece_router.patch(
  "/edit-invoice-inventory/:invoice_id",
  edit_fleece_invoice_inventory
);
fleece_router.post("/download-excel-veneer", fleeceCsv);
fleece_router.get(
  "/fleece-item-listing-by-invoice/:invoice_id",
  fleece_item_listing_by_invoice
);
fleece_router.post("/download-excel-fleece", fleeceLogsCsv);

//dropdown
fleece_router.get("/item-srno-dropdown", item_sr_no_dropdown);
fleece_router.get("/inward-srno-dropdown", inward_sr_no_dropdown);

export default fleece_router;
