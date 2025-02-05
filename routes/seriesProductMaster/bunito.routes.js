import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addBunito,
  dropdownBunito,
  fetchBunitoList,
  fetchSingleBunito,
  updateBunitoDetails, updateStatus
} from '../../controllers/seriesProductMaster/bunito.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-bunito',
  AuthMiddleware,
  MulterFunction(`public/upload/images/series_product_master/bunito`).single(
    'image'
  ),
  addBunito
);
router.post(
  '/update-bunito/:id',
  AuthMiddleware,
  MulterFunction(`public/upload/images/series_product_master/bunito`).single(
    'image'
  ),
  updateBunitoDetails
);
router.post('/list-bunito', AuthMiddleware, fetchBunitoList);
router.patch('/update-bunito-status', AuthMiddleware, updateStatus);
router.get('/list-single-bunito/:id', AuthMiddleware, fetchSingleBunito);

//without permission
router.get('/dropdown-bunito', AuthMiddleware, dropdownBunito);

export default router;
