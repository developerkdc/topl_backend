import express from "express";
import {
  add_flitching_inventory,
  edit_flitching_inventory,
  listing_flitching_inventory,
} from "../../../controllers/factory/flitching/flitchingController.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post("/add-flitching", CheckRoleAndTokenAccess, add_flitching_inventory);
router.patch(
  "/edit-flitching/:id",
  CheckRoleAndTokenAccess,
  edit_flitching_inventory
);
router.get(
  "/list-flitching",
  CheckRoleAndTokenAccess,
  listing_flitching_inventory
);

export default router;
