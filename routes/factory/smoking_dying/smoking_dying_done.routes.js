import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { add_process_done_details, edit_process_done_details, fetch_all_process_done_details, fetch_single_process_done_details, fetch_smoking_dying_done_history } from '../../../controllers/factory/smoking_dying/smoking_dying_done.controller.js';

const smokingDyingDoneRouter = express.Router();

smokingDyingDoneRouter.post(
  '/add-smoking-dying-done',
  AuthMiddleware,
  add_process_done_details
);

smokingDyingDoneRouter.patch(
  '/edit-smoking-dying-done/:process_done_details_id',
  AuthMiddleware,
  edit_process_done_details
);

smokingDyingDoneRouter.post(
  '/listing-process-done',
  AuthMiddleware,
  fetch_all_process_done_details
);

smokingDyingDoneRouter.get(
  '/fetch-single-process-done/:process_done_details_id',
  AuthMiddleware,
  fetch_single_process_done_details
);
smokingDyingDoneRouter.post(
  '/list-smoking-dying-history',
  AuthMiddleware,
  fetch_smoking_dying_done_history
);

// smokingDyingDoneRouter.post(
//   '/revert-issue-for-smoking-dying/:unique_identifier/:pallet_number',
//   AuthMiddleware,
//   revert_issued_for_smoking_dying_item
// );

export default smokingDyingDoneRouter;
