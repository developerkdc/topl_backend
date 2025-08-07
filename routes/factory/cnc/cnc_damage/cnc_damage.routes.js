import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_cnc_damage,
  download_excel_factory_cnc_damage,
  listing_cnc_damage,
  revert_damage_to_cnc_done,
} from '../../../../controllers/factory/cnc/cnc_damage/cnc_damage.controller.js';

const cnc_damage_router = Router();

cnc_damage_router.post('/add-to-damage', AuthMiddleware, add_cnc_damage);
cnc_damage_router.post('/list', AuthMiddleware, listing_cnc_damage);
cnc_damage_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_damage_to_cnc_done
);
cnc_damage_router.post(
  '/download-factory-cnc-damage-excel',
  AuthMiddleware,
  download_excel_factory_cnc_damage
);
export default cnc_damage_router;
