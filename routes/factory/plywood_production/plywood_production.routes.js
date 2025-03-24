import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { create_plywood_production } from '../../../controllers/factory/plywood_production/create_plywood_production/create_plywood_production.js';
const plywoodProductionRouter = express.Router();

plywoodProductionRouter.post(
  '/listing-plywood-production',
  AuthMiddleware,
  //   RolesPermissions('plywood_production_factory', 'view'),
//   listing_issue_for_crosscutting
);
plywoodProductionRouter.post(
  '/list-plywood-production-done-history',
  AuthMiddleware,
  //   RolesPermissions('crosscut_factory', 'view'),
//   listing_crosscutting_done_history
);
plywoodProductionRouter.post(
  '/add-plywood-production',
  AuthMiddleware,
//   RolesPermissions('crosscut_factory', 'create'),
  create_plywood_production
);

export default plywoodProductionRouter;
