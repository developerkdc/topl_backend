import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { addIssueForPeelingFromCrosscutDone, addIssueForPeelingFromLogInventory } from '../../../controllers/factory/peeling/issue_for_peeling.controller.js';
const issueForPeelingRouter = express.Router();

issueForPeelingRouter.post(
  '/add-log-item-issue-for-peeling',
  AuthMiddleware,
  addIssueForPeelingFromLogInventory
);
issueForPeelingRouter.post(
  '/add-crosscut-done-issue-for-peeling',
  AuthMiddleware,
  addIssueForPeelingFromCrosscutDone
);

export default issueForPeelingRouter;
