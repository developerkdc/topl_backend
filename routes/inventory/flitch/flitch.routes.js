import express from "express";
import {
  add_flitch_inventory,
  add_single_flitch_item_inventory,
  edit_flitch_invoice_inventory,
  edit_flitch_item_inventory,
  flitchLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_flitch_inventory,
} from "../../../controllers/inventory/flitch/flitch.controller.js";
const flitch_router = express.Router();

flitch_router.post("/list-inventory", listing_flitch_inventory);
flitch_router.post("/add-inventory", add_flitch_inventory);
flitch_router.post("/add-item-inventory", add_single_flitch_item_inventory);
flitch_router.patch(
  "/edit-item-inventory/:item_id",
  edit_flitch_item_inventory
);
flitch_router.patch(
  "/edit-invoice-inventory/:invoice_id",
  edit_flitch_invoice_inventory
);
flitch_router.post("/download-excel-flitch-logs", flitchLogsCsv);

//Dropdowns
flitch_router.get("/item-srno-dropdown", item_sr_no_dropdown);
flitch_router.get("/inward-srno-dropdown", inward_sr_no_dropdown);


export default flitch_router;
