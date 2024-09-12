import { Router } from "express";
import {
  add_venner_inventory,
  edit_venner_inventory,
  listing_venner_inventory,
} from "../../../controllers/inventory/venner/venner.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";

const router = Router();

router.post("/add-inventory", CheckRoleAndTokenAccess, add_venner_inventory);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_venner_inventory
);
router.get(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_venner_inventory
);

export default router;
