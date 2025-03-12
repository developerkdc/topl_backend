import express from 'express';

import { fetch_issue_for_slicing_wastage_details } from '../../../../controllers/factory/slicing/issue_for_slicing/issue_for_slicing_wastage.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';

const issue_for_slicing_wastage_router = express.Router();
issue_for_slicing_wastage_router.post(
  '/list-issue-for-slicing-wastage',
  AuthMiddleware,
  fetch_issue_for_slicing_wastage_details
);

export default issue_for_slicing_wastage_router;
