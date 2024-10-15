import express from "express";
import {
  add_flitching_inventory,
  edit_flitching_inventory,
  listing_flitching_done_inventory,
  listing_issue_for_flitching,
  log_no_dropdown,
  revert_issue_for_flitching,
  fetch_all_flitchings_by_issue_for_flitching_id
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

router.post("/add-flitching", AuthMiddleware, RolesPermissions("flitching_factory", "create"), add_flitching_inventory);
router.patch(
  "/edit-flitching/:id",
  edit_flitching_inventory
);
router.post("/list-flitching-done", AuthMiddleware, RolesPermissions("flitching_factory", "view"), listing_flitching_done_inventory);
router.get("/log-no-dropdown", log_no_dropdown);
router.get("/list-flitchings-by-issued-flitching-id/:id", AuthMiddleware, RolesPermissions("flitching_factory", "view"), fetch_all_flitchings_by_issue_for_flitching_id)

export default router;
