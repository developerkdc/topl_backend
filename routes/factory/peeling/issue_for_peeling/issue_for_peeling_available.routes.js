import express from 'express';
import { fetch_issue_for_peeling_available_details } from '../../../../controllers/factory/peeling/issues_for_peeling/issue_for_peeling_available.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
const issue_for_peeling_available = express.Router();

issue_for_peeling_available.post(
  '/list-issue-for-peeling-available',
  AuthMiddleware,
  fetch_issue_for_peeling_available_details
);

export default issue_for_peeling_available;
