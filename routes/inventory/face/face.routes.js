import express from "express";
import {
  add_face_inventory,
  add_single_face_item_inventory,
  edit_face_invoice_inventory,
  edit_face_item_inventory,
  edit_face_item_invoice_inventory,
  face_item_listing_by_invoice,
  faceLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_face_inventory,
} from "../../../controllers/inventory/face/face.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
const router = express.Router();
router.post("/list-inventory", AuthMiddleware, RolesPermissions("face_inventory", "view"), listing_face_inventory);
router.post("/add-inventory", AuthMiddleware, RolesPermissions("face_inventory", "create"), add_face_inventory);
router.post("/add-item-inventory", AuthMiddleware, RolesPermissions("face_inventory", "create"), add_single_face_item_inventory);
router.patch("/edit-item-inventory/:item_id", AuthMiddleware, RolesPermissions("face_inventory", "edit"), edit_face_item_inventory);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  AuthMiddleware,
  RolesPermissions("face_inventory", "edit"),
  edit_face_invoice_inventory
);
router.get(
  "/face-item-listing-by-invoice/:invoice_id",
  AuthMiddleware,
  RolesPermissions("face_inventory", "edit"),
  face_item_listing_by_invoice
);
router.patch(
  "/edit-invoice-item-inventory/:invoice_id",
  AuthMiddleware,
  RolesPermissions("face_inventory", "edit"),
  edit_face_item_invoice_inventory
);
router.post("/download-excel-face", AuthMiddleware, RolesPermissions("face_inventory", "view"), faceLogsCsv);

//dropdown
router.get("/item-srno-dropdown", AuthMiddleware, item_sr_no_dropdown);
router.get("/inward-srno-dropdown", AuthMiddleware, inward_sr_no_dropdown);

export default router;
