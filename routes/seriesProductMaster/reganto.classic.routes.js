import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addRegantoClassic,
  dropdownRegantoClassic,
  fetchRegantoClassicList,
  fetchSingleRegantoClassic,
  updateRegantoClassicDetails,
} from '../../controllers/seriesProductMaster/reganto.classic.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-reganto-classic',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/reganto_classic`
  ).single('image'),
  addRegantoClassic
);
router.post(
  '/update-reganto-classic/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/reganto_classic`
  ).single('image'),
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
