import express from "express";
import {
  add_face_inventory,
  edit_face_inventory,
  listing_face_inventory,
} from "../../../controllers/inventory/face/face.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post("/add-inventory", CheckRoleAndTokenAccess, add_face_inventory);
router.patch(
  "/edit-inventory/:item_id/:invoice_id",
  CheckRoleAndTokenAccess,
  edit_face_inventory
);
router.get("/list-inventory", CheckRoleAndTokenAccess, listing_face_inventory);

export default router;
