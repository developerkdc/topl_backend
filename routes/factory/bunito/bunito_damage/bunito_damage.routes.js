import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_bunito_damage,
  download_excel_bunito_damage,
  listing_bunito_damage,
  revert_damage_to_bunito_done,
} from '../../../../controllers/factory/bunito/bunito_damage/bunito_damage.controller.js';

const bunito_damage_router = Router();

bunito_damage_router.post('/add-to-damage', AuthMiddleware, add_bunito_damage);
bunito_damage_router.post('/list', AuthMiddleware, listing_bunito_damage);
bunito_damage_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_damage_to_bunito_done
);

//Bunito Damage Download excel 
bunito_damage_router.post('/download-factory-bunito-damage-excel', AuthMiddleware, download_excel_bunito_damage);
export default bunito_damage_router;
