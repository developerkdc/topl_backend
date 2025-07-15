import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_canvas_damage,
  listing_canvas_damage,
  revert_damage_to_canvas_done,
} from '../../../../controllers/factory/canavas/canvas_damage/canvas_damage.controller.js';

const canvas_damage_router = Router();

canvas_damage_router.post('/add-to-damage', AuthMiddleware, add_canvas_damage);
canvas_damage_router.post('/list', AuthMiddleware, listing_canvas_damage);
canvas_damage_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_damage_to_canvas_done
);

// Export Api
canvas_damage_router.post(
  '/download-factory-canvas-damage-excel',
  AuthMiddleware,
  listing_canvas_damage
);
export default canvas_damage_router;
