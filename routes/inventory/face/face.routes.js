import express from "express";
import {
  add_face_inventory,
  add_single_face_item_inventory,
  edit_face_invoice_inventory,
  edit_face_item_inventory,
  listing_face_inventory,
} from "../../../controllers/inventory/face/face.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();
router.post("/list-inventory", CheckRoleAndTokenAccess, listing_face_inventory);
router.post("/add-inventory", CheckRoleAndTokenAccess, add_face_inventory);
router.post(
  "/add-item-inventory",
  // CheckRoleAndTokenAccess,
  add_single_face_item_inventory
);
router.patch(
  "/edit-item-inventory/:item_id",
  // CheckRoleAndTokenAccess,
  edit_face_item_inventory
);
router.patch(
  "/edit-invoice-inventory/:invoice_id",
  // CheckRoleAndTokenAccess,
  edit_face_invoice_inventory
);

export default router;
