import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { create_plywood_production } from '../../../controllers/factory/plywood_production/create_plywood_production/create_plywood_production.js';
import {
  add_to_damage_from_plywood_production_done,
  listing_plywood_production_done,
  revert_plywood_production_done_items,
  single_plywood_production_done_for_update,
  update_plywood_production_done,
} from '../../../controllers/factory/plywood_production/plywood_production_done/plywood_production_done.js';
import {
  listing_plywood_production_damage,
  revert_plywood_production_damage,
} from '../../../controllers/factory/plywood_production/plywood_production_damage/plywood_production_damage.js';
import { listing_plywood_production_history } from '../../../controllers/factory/plywood_production/plywood_production_history/plywood_production_history.js';
const plywoodProductionRouter = express.Router();

plywoodProductionRouter.post(
  '/add-plywood-production',
  AuthMiddleware,
  create_plywood_production
);

plywoodProductionRouter.post(
  '/listing-plywood-production-done',
  AuthMiddleware,
  listing_plywood_production_done
);

plywoodProductionRouter.patch(
  '/update-plywood-production-done/:id',
  AuthMiddleware,
  update_plywood_production_done
);

plywoodProductionRouter.get(
  '/fetch-single-plywood-production-done-item/:id',
  AuthMiddleware,
  single_plywood_production_done_for_update
);

plywoodProductionRouter.post(
  '/list-plywood-production-history',
  AuthMiddleware,
  //   RolesPermissions('crosscut_factory', 'view'),
  listing_plywood_production_history
);

//damage routes

plywoodProductionRouter.post(
  '/revert-plywood-production-damage/:id',
  AuthMiddleware,
  revert_plywood_production_damage
);

plywoodProductionRouter.post(
  '/add-plywood-production-damage/:id',
  AuthMiddleware,
  add_to_damage_from_plywood_production_done
);

plywoodProductionRouter.post(
  '/listing-plywood-production-damage',
  AuthMiddleware,
  listing_plywood_production_damage
);

plywoodProductionRouter.post(
  '/revert/:id',
  AuthMiddleware,
  revert_plywood_production_done_items
);
export default plywoodProductionRouter;
