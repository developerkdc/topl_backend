import express from "express";
import {
  add_core_inventory,
  edit_core_inventory,
  listing_core_inventory,
} from "../../../controllers/inventory/core/core.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post("/add-inventory", CheckRoleAndTokenAccess, add_core_inventory);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_core_inventory
);
router.get("/list-inventory", CheckRoleAndTokenAccess, listing_core_inventory);

export default router;
