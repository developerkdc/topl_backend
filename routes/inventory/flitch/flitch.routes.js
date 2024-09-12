import express from "express";
import {
  add_flitch_inventory,
  edit_flitch_inventory,
} from "../../../controllers/inventory/flitch/flitch.controller.js";
const flitch_router = express.Router();

flitch_router.post("/add-inventory", add_flitch_inventory);
flitch_router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  edit_flitch_inventory
);

export default flitch_router;
