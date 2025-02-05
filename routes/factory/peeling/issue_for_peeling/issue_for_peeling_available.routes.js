import express from 'express';
import { add_reflitching_details, edit_reflitching_details, fetch_all_details_by_reflitching_id, fetch_all_reflitching_items, fetch_issue_for_peeling_available_details, fetch_reflitching_items_history, reflitching_issue_for_slicing, revert_all_reflitching } from '../../../../controllers/factory/peeling/issues_for_peeling/issue_for_peeling_available.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
const issue_for_peeling_available = express.Router();

issue_for_peeling_available.post(
  '/list-issue-for-peeling-available',
  AuthMiddleware,
  fetch_issue_for_peeling_available_details
);

issue_for_peeling_available.post(
  '/add-re-flitching',
  AuthMiddleware,
  add_reflitching_details
);

issue_for_peeling_available.patch(
  '/edit-re-flitching/:reflitching_id',
  AuthMiddleware,
  edit_reflitching_details
);

issue_for_peeling_available.post(
  '/list-reflitching-items',
  AuthMiddleware,
  fetch_all_reflitching_items
);

issue_for_peeling_available.post(
  '/list-reflitching-items-history',
  AuthMiddleware,
  fetch_reflitching_items_history
);

issue_for_peeling_available.get(
  '/fetch-single-reflitching-details/:id',
  AuthMiddleware,
  fetch_all_details_by_reflitching_id
);

issue_for_peeling_available.post(
  '/revert-reflitching-details/:id',
  AuthMiddleware,
  revert_all_reflitching
);

issue_for_peeling_available.post(
  '/reflitching-issue-for-slicing',
  AuthMiddleware,
  reflitching_issue_for_slicing
);

export default issue_for_peeling_available;
