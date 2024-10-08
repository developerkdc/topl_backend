import express from "express";
import {
  add_flitching_inventory,
  edit_flitching_inventory,
  listing_issue_for_flitching,
  revert_issue_for_flitching
} from "../../../controllers/factory/flitching/flitchingController.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/listing_issue_for_flitching",
  AuthMiddleware, RolesPermissions("flitching_factory", "view"),
  listing_issue_for_flitching
);

router.post(
  "/revert-issue-for-flitching/:issue_for_flitching_id",
  AuthMiddleware, RolesPermissions("flitching_factory", "edit"),
  revert_issue_for_flitching
);

router.post("/add-flitching", CheckRoleAndTokenAccess, add_flitching_inventory);
router.patch(
  "/edit-flitching/:id",
  edit_flitching_inventory
);

export default router;
