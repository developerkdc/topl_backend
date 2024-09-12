import express from "express";
import {
  add_otherGoods_inventory,
  edit_otherGoods_inventory,
  listing_otherGoods_inventory,
} from "../../../controllers/inventory/otherGoods/otherGoods.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/add-inventory",
  CheckRoleAndTokenAccess,
  add_otherGoods_inventory
);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_otherGoods_inventory
);
router.get(
  "/list-inventory",
  CheckRoleAndTokenAccess,
  listing_otherGoods_inventory
);

export default router;
