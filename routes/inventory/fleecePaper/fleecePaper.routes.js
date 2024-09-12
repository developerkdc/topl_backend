import express from "express";
import {
  add_fleecePaper_inventory,
  edit_fleecePaper_inventory,
  listing_fleecePaper_inventory,
} from "../../../controllers/inventory/fleecePaper/fleecePaper.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/add-inventory",
  CheckRoleAndTokenAccess,
  add_fleecePaper_inventory
);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_fleecePaper_inventory
);
router.get(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_fleecePaper_inventory
);

export default router;
