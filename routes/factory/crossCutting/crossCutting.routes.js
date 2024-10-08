import express from "express";
import {
  add_cross_cutting_inventory,
  addCrossCutDone,
  edit_cross_cutting_inventory,
  latest_crosscutting_code,
  listing_cross_cutting_inventory,
  listing_issue_for_crosscutting,
  revert_issue_for_crosscutting,
} from "../../../controllers/factory/crossCutting/crossCutting.controller.js";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
const router = express.Router();

//Issue for crosscutting
router.post(
  "/revert-issue-for-crosscutting/:issue_for_crosscutting_id",
  revert_issue_for_crosscutting
);
router.post(
  "/listing_issue_for_crosscutting",
  listing_issue_for_crosscutting
);
router.post("/add-crossCut-done", addCrossCutDone)


// Crosscutting
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
  // CheckRoleAndTokenAccess,add token access and uncomment
  listing_cross_cutting_inventory
);
router.get(
  "/latest-code-crossCutting/:id",
  latest_crosscutting_code
);

export default router;
