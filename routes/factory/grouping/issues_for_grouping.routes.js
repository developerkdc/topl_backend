import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { issue_for_grouping_from_dressing_done, issue_for_grouping_from_smoking_dying_done } from '../../../controllers/factory/grouping/issues_for_grouping.controller.js';
const issueForGroupingRouter = express.Router();

issueForGroupingRouter.post(
  '/add-issue-for-grouping-form-smoking-dying/:process_done_id',
  AuthMiddleware,
  issue_for_grouping_from_smoking_dying_done
);
issueForGroupingRouter.post(
  '/add-issue-for-grouping-form-dressing-done/:dressing_done_id',
  AuthMiddleware,
  issue_for_grouping_from_dressing_done
);

export default issueForGroupingRouter;
