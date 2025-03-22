// import express from 'express';
// // import {
// //   add_cross_cutting_inventory,
// //   add_crosscut_issue_for_flitching,
// //   addCrossCutDone,
// //   crossCuttingDoneExcel,
// //   edit_cross_cutting_inventory,
// //   fetch_all_crosscuts_by_issue_for_crosscut_id,
// //   latest_crosscutting_code,
// //   listing_cross_cutting_inventory,
// //   listing_issue_for_crosscutting,
// //   log_no_dropdown,
// //   revert_crosscutting_done,
// //   // machine_name_dropdown,
// //   revert_issue_for_crosscutting,
// //   listing_crosscutting_done_history,
// // } from '../../../controllers/factory/crossCutting/crossCutting.controller.js';
// import AuthMiddleware from '../../../middlewares/verifyToken.js';
// import RolesPermissions from '../../../middlewares/permission.js';
// const router = express.Router();


// router.post(
//   '/listing_issue_for_plywood_production',
//   AuthMiddleware,
//   RolesPermissions('plywood_production_factory', 'view'),
//   listing_issue_for_crosscutting
// );
// router.post(
//   '/list-crosscut-done-history',
//   AuthMiddleware,
//   RolesPermissions('crosscut_factory', 'view'),
//   listing_crosscutting_done_history
// );
// router.post(
//   '/add-crossCut-done',
//   AuthMiddleware,
//   RolesPermissions('crosscut_factory', 'create'),
//   addCrossCutDone
// );

// export default router;