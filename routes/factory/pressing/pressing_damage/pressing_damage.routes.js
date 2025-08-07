import express from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  list_pressing_damage,
  revert_pressing_damage,
} from '../../../../controllers/factory/pressing/pressing_damage/pressing_damage.controller.js';
const pressing_damage_router = express.Router();

pressing_damage_router.post(
  '/list-pressing-damage',
  AuthMiddleware,
  list_pressing_damage
);
pressing_damage_router.post(
  '/pressing_damage_revert/:id',
  AuthMiddleware,
  revert_pressing_damage
);

export default pressing_damage_router;
