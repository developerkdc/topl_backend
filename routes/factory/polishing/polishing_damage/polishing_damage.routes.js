import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_polishing_damage,
  listing_polishing_damage,
  revert_damage_to_polishing_done,
} from '../../../../controllers/factory/polishing/polishing_damage/polishing_damage.controller.js';

const polishing_damage_router = Router();

polishing_damage_router.post(
  '/add-to-damage',
  AuthMiddleware,
  add_polishing_damage
);
polishing_damage_router.post(
  '/list',
  AuthMiddleware,
  listing_polishing_damage
);
polishing_damage_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_damage_to_polishing_done
);

export default polishing_damage_router;
