import express from "express";
import {
  add_cross_cutting_inventory,
  edit_cross_cutting_inventory,
  listing_cross_cutting_inventory,
} from "../../../controllers/factory/crossCutting/crossCutting.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/add-crossCutting/:issued_crosscutting_id",
  add_cross_cutting_inventory
);
router.patch(
  "/edit-crossCutting/:id",
  CheckRoleAndTokenAccess,
  edit_cross_cutting_inventory
);
router.get(
  "/list-crossCutting",
  CheckRoleAndTokenAccess,
  listing_cross_cutting_inventory
);

export default router;
