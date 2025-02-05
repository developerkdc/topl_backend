import express from 'express';

import { fetch_issue_for_slicing_available_details } from '../../../../controllers/factory/slicing/issue_for_slicing/issue_for_slicing_available.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';

const issue_for_slicing_available_router = express.Router();

issue_for_slicing_available_router.post(
  '/list-issue-for-slicing-available',
  AuthMiddleware,
  fetch_issue_for_slicing_available_details
);

export default issue_for_slicing_available_router;
