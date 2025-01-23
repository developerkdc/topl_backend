import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addRegantoClassic,
  dropdownRegantoClassic,
  fetchRegantoClassicList,
  fetchSingleRegantoClassic,
  updateRegantoClassicDetails,
} from '../../controllers/seriesProductMaster/reganto.classic.controller.js';
const router = Router();

router.post('/add-reganto-classic', AuthMiddleware, addRegantoClassic);
router.post(
  '/update-reganto-classic/:id',
  AuthMiddleware,
  updateRegantoClassicDetails
);
router.post('/list-reganto-classic', AuthMiddleware, fetchRegantoClassicList);
router.get(
  '/list-single-reganto-classic/:id',
  AuthMiddleware,
  fetchSingleRegantoClassic
);

//without permission
router.get('/dropdown-reganto-classic', AuthMiddleware, dropdownRegantoClassic);

export default router;
