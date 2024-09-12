import { Router } from "express";
import {
  add_plywood_inventory,
  edit_plywood_inventory,
  listing_plywood_inventory,
} from "../../../controllers/inventory/plywood/plywood.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();

router.post("/add-inventory", CheckRoleAndTokenAccess, add_plywood_inventory);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_plywood_inventory
);
router.get(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_plywood_inventory
);

export default router;
