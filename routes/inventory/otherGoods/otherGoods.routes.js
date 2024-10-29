import express from "express";
import {
  add_otherGoods_inventory,
  add_single_otherGoods_item_inventory,
  edit_otherGoods_invoice_inventory,
  edit_otherGoods_item_inventory,
  edit_othergoods_item_invoice_inventory,
  listing_otherGodds_inventory,
  othergoods_item_listing_by_invoice,
  otherGoodsLogsCsv, inward_sr_no_dropdown, item_sr_no_dropdown
} from "../../../controllers/inventory/otherGoods/otherGoods.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { verifyApproval } from "../../../middlewares/approval.middleware.js";
const router = express.Router();

router.post("/list-inventory", AuthMiddleware, RolesPermissions("other_goods_inventory", "view"), listing_otherGodds_inventory);
router.post("/add-inventory", AuthMiddleware, RolesPermissions("other_goods_inventory", "create"), add_otherGoods_inventory);
router.post(
  "/add-item-inventory",
  AuthMiddleware,
  RolesPermissions("other_goods_inventory", "create"),
  add_single_otherGoods_item_inventory
);
router.patch(
  "/edit-item-inventory/:item_id",
  AuthMiddleware,
  RolesPermissions("other_goods_inventory", "edit"),
  edit_otherGoods_item_inventory
);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  AuthMiddleware,
  RolesPermissions("other_goods_inventory", "edit"),
  edit_otherGoods_invoice_inventory
);
router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  AuthMiddleware,
  RolesPermissions("other_goods_inventory", "edit"),
  verifyApproval("otherGoods_inventory", "edit"),
  edit_othergoods_item_invoice_inventory
);
router.get(
  "/othergoods-item-listing-by-invoice/:invoice_id",
  AuthMiddleware,
  RolesPermissions("other_goods_inventory", "edit"),
  othergoods_item_listing_by_invoice
);
router.post("/download-excel-othergoods-logs", AuthMiddleware, RolesPermissions("other_goods_inventory", "view"), otherGoodsLogsCsv);

router.get("/item-srno-dropdown", AuthMiddleware, item_sr_no_dropdown);
router.get("/inward-srno-dropdown", AuthMiddleware, inward_sr_no_dropdown);

export default router;
