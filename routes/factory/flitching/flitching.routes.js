import express from "express";
import {
  add_flitching_inventory,
  edit_flitching_inventory,
  listing_issue_for_flitching,
  revert_issue_for_flitching
} from "../../../controllers/factory/flitching/flitchingController.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

router.post(
  "/listing_issue_for_flitching",
  listing_issue_for_flitching
);

router.post(
  "/revert-issue-for-flitching/:issue_for_flitching_id",
  revert_issue_for_flitching
);

router.post("/add-flitching", CheckRoleAndTokenAccess, add_flitching_inventory);
router.patch(
  "/edit-flitching/:id",
  CheckRoleAndTokenAccess,
  edit_flitching_inventory
);

export default router;
