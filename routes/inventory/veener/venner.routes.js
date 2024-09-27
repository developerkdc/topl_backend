import { Router } from "express";
import {
  add_veneer_inventory,
  add_single_veneer_item_inventory,
  edit_veneer_invoice_inventory,
  edit_veneer_item_inventory,
  edit_veneer_item_invoice_inventory,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_veneer_inventory,
  veneer_item_listing_by_invoice,
  veneerCsv,
  veneerLogsCsv,
} from "../../../controllers/inventory/venner/venner.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const veneer_router = Router();

veneer_router.post("/list-inventory", listing_veneer_inventory);
veneer_router.post(
  "/add-inventory",
  CheckRoleAndTokenAccess,
  add_veneer_inventory
);
veneer_router.post("/add-item-inventory", add_single_veneer_item_inventory);
veneer_router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  edit_veneer_item_invoice_inventory
);
veneer_router.patch(
  "/edit-item-inventory/:item_id",
  edit_veneer_item_inventory
);
veneer_router.patch(
  "/edit-invoice-inventory/:invoice_id",
  edit_veneer_invoice_inventory
);
veneer_router.post("/download-excel-veneer", veneerCsv);
veneer_router.get(
  "/veneer-item-listing-by-invoice/:invoice_id",
  veneer_item_listing_by_invoice
);
veneer_router.post("/download-excel-veneer", veneerLogsCsv);

//dropdown
veneer_router.get("/item-srno-dropdown", item_sr_no_dropdown);
veneer_router.get("/inward-srno-dropdown", inward_sr_no_dropdown);

export default veneer_router;
