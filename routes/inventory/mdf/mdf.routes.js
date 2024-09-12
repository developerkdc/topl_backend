import { Router } from "express";
import {
  add_mdf_inventory,
  edit_mdf_inventory,
  listing_mdf_inventory,
} from "../../../controllers/inventory/mdf/mdf.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();

router.post("/add-inventory", CheckRoleAndTokenAccess, add_mdf_inventory);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_mdf_inventory
);
router.get("/list-inventory", CheckRoleAndTokenAccess, listing_mdf_inventory);

export default router;
