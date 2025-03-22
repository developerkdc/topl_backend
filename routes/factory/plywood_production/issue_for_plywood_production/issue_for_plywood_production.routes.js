import express from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';

import { addIssueForPlywoodProductionFromCore, addIssueForPlywoodProductionFromFace } from '../../../../controllers/factory/plywood_production/issue_for_plywood_production/issue_for_plywood_production.js';

const issueForPlywoodProductionRouter = express.Router();

issueForPlywoodProductionRouter.post(
  '/add-issue-for-plywood-production-from-face',
  AuthMiddleware,
  addIssueForPlywoodProductionFromFace
);

issueForPlywoodProductionRouter.post(
    '/add-issue-for-plywood-production-from-core',
    AuthMiddleware,
    addIssueForPlywoodProductionFromCore
  );

export default issueForPlywoodProductionRouter;