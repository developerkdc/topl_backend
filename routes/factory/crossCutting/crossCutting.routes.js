import express from 'express';
import {
  add_cross_cutting_inventory,
  add_crosscut_issue_for_flitching,
  addCrossCutDone,
  crossCuttingDoneExcel,
  edit_cross_cutting_inventory,
  fetch_all_crosscuts_by_issue_for_crosscut_id,
  latest_crosscutting_code,
  listing_cross_cutting_inventory,
  listing_issue_for_crosscutting,
  log_no_dropdown,
  revert_crosscutting_done,
  // machine_name_dropdown,
  revert_issue_for_crosscutting,
} from '../../../controllers/factory/crossCutting/crossCutting.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
const router = express.Router();

//Issue for crosscutting
router.post(
  '/revert-issue-for-crosscutting/:issue_for_crosscutting_id',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'view'),
  revert_issue_for_crosscutting
);
router.post(
  '/listing_issue_for_crosscutting',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'view'),
  listing_issue_for_crosscutting
);
router.post(
  '/add-crossCut-done',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'create'),
  addCrossCutDone
);

// Crosscutting
// router.post(
//   "/add-crossCutting/:issued_crosscutting_id",
//   AuthMiddleware, RolesPermissions("crosscut_factory", "create"),
//   add_cross_cutting_inventory
// ); // old
router.post(
  '/edit-crossCutting/:id',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'edit'),
  verifyApproval('crosscut_factory', 'edit'),
  edit_cross_cutting_inventory
);
router.post(
  '/list-crossCutting-done',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'view'),
  listing_cross_cutting_inventory
);
router.get(
  '/latest-code-crossCutting/:issued_crosscutting_id',
  AuthMiddleware,
  latest_crosscutting_code
);

router.get(
  '/list-crosscuts-by-issued-crosscut-id/:id',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'view'),
  fetch_all_crosscuts_by_issue_for_crosscut_id
);

router.get('/log-no-dropdown', log_no_dropdown);
router.post(
  '/revert-crosscutting-done-items/:id',
  AuthMiddleware,
  revert_crosscutting_done
);
router.post(
  '/add-crosscut-issue-for-flitching/:crosscut_id',
  AuthMiddleware,
  add_crosscut_issue_for_flitching
);
// router.get("/machine-name-dropdown", machine_name_dropdown)
router.post(
  '/download-crosscutting-done-excel',
  AuthMiddleware,
  RolesPermissions('crosscut_factory', 'view'),
  crossCuttingDoneExcel
);

export default router;
