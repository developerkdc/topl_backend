import { Router } from "express";
import {
  add_mdf_inventory,
  add_single_mdf_item_inventory,
  edit_mdf_invoice_inventory,
  edit_mdf_item_inventory,
  edit_mdf_item_invoice_inventory,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_mdf_inventory,
  mdf_item_listing_by_invoice,
  mdfLogsCsv,
} from "../../../controllers/inventory/mdf/mdf.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";

const router = Router();

// router.post("/add-inventory", CheckRoleAndTokenAccess, add_mdf_inventory);
// router.patch(
//   "/edit-inventory/:item_id/:invoice_id",
//   CheckRoleAndTokenAccess,
//   edit_mdf_inventory
// );
// router.get("/list-inventory", CheckRoleAndTokenAccess, listing_mdf_inventory);

router.post("/list-inventory", AuthMiddleware, RolesPermissions("mdf_inventory", "view"), listing_mdf_inventory);
router.post("/add-inventory", AuthMiddleware, RolesPermissions("mdf_inventory", "create"), add_mdf_inventory);
router.post("/add-item-inventory", AuthMiddleware, RolesPermissions("mdf_inventory", "create"), add_single_mdf_item_inventory);
router.patch("/edit-item-inventory/:item_id", AuthMiddleware, RolesPermissions("mdf_inventory", "edit"), edit_mdf_item_inventory);
router.patch("/edit-invoice-inventory/:invoice_id", AuthMiddleware, RolesPermissions("mdf_inventory", "edit"), edit_mdf_invoice_inventory);
router.post("/download-excel-mdf", AuthMiddleware, RolesPermissions("mdf_inventory", "view"), mdfLogsCsv);

router.get(
  "/mdf-item-listing-by-invoice/:invoice_id",
  AuthMiddleware,
  RolesPermissions("mdf_inventory", "edit"),
  mdf_item_listing_by_invoice
);
router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  AuthMiddleware,
  RolesPermissions("mdf_inventory", "edit"),
  edit_mdf_item_invoice_inventory
);

//dropdown
router.get("/item-srno-dropdown", AuthMiddleware, item_sr_no_dropdown);
router.get("/inward-srno-dropdown", AuthMiddleware, inward_sr_no_dropdown);

export default router;
