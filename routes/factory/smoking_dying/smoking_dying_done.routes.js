import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  add_process_done_details,
  edit_process_done_details,
  fetch_all_process_done_details,
  fetch_single_process_done_details,
  revert_process_done_details,
} from '../../../controllers/factory/smoking_dying/smoking_dying_done.controller.js';

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
  '/revert-process-done-details/:id',
  AuthMiddleware,
  revert_process_done_details
);

export default smokingDyingDoneRouter;
