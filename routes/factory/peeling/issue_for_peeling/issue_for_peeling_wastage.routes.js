import express from 'express';
import { fetch_issue_for_peeling_wastage_details } from '../../../../controllers/factory/peeling/issues_for_peeling/issue_for_peeling_wastage.controller.js';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
const issue_for_peeling_wastage_router = express.Router();

issue_for_peeling_wastage_router.post(
    '/list-issue-for-peeling-wastage',
    AuthMiddleware,
    fetch_issue_for_peeling_wastage_details
  );

export default issue_for_peeling_wastage_router;