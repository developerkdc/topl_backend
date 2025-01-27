import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { addIssueForPeelingFromLogInventory } from '../../../controllers/factory/peeling/issue_for_peeling.controller.js';
const issueForPeelingRouter = express.Router();

issueForPeelingRouter.post(
  '/add-issue-for-peeling',
  AuthMiddleware,
  addIssueForPeelingFromLogInventory
);

export default issueForPeelingRouter;
