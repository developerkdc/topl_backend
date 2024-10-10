import express from "express";
import {
  add_cross_cutting_inventory,
  addCrossCutDone,
  edit_cross_cutting_inventory,
  fetch_all_crosscuts_by_issue_for_crosscut_id,
  latest_crosscutting_code,
  listing_cross_cutting_inventory,
  listing_issue_for_crosscutting,
  revert_issue_for_crosscutting,
} from "../../../controllers/factory/crossCutting/crossCutting.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
const router = express.Router();

//Issue for crosscutting
router.post(
  "/revert-issue-for-crosscutting/:issue_for_crosscutting_id",
  AuthMiddleware, RolesPermissions("crosscut_factory", "view"),
  revert_issue_for_crosscutting
);
router.post(
  "/listing_issue_for_crosscutting",
  AuthMiddleware, RolesPermissions("crosscut_factory", "view"),
  listing_issue_for_crosscutting
);
router.post("/add-crossCut-done", AuthMiddleware, RolesPermissions("crosscut_factory", "create"), addCrossCutDone)


// Crosscutting
// router.post(
//   "/add-crossCutting/:issued_crosscutting_id",
//   AuthMiddleware, RolesPermissions("crosscut_factory", "create"),
//   add_cross_cutting_inventory
// ); // old 
router.patch(
  "/edit-crossCutting/:id",
  AuthMiddleware, RolesPermissions("crosscut_factory", "edit"),
  edit_cross_cutting_inventory
);
router.post(
  "/list-crossCutting-done",
  AuthMiddleware, RolesPermissions("crosscut_factory", "view"),
  listing_cross_cutting_inventory
);
router.get(
  "/latest-code-crossCutting/:issued_crosscutting_id",
  AuthMiddleware,
  latest_crosscutting_code
);

router.get("/list-crosscuts-by-issued-crosscut-id/:id", AuthMiddleware, RolesPermissions("crosscut_factory", "view"), fetch_all_crosscuts_by_issue_for_crosscut_id)

export default router;
