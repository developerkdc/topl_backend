import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addMarvel,
  dropdownMarvel,
  fetchMarvelList,
  fetchSingleMarvel,
  updateMarvelDetails,
} from '../../controllers/seriesProductMaster/marvel.master.controller.js';
const router = Router();
import { MulterFunction } from '../../config/multer/multer.js';
router.post(
  '/add-marvel',
  AuthMiddleware,
  MulterFunction(`public/upload/images/series_product_master/marvel`).single(
    'image'
  ),
  addMarvel
);
router.post(
  '/update-marvel/:id',
  AuthMiddleware,
  MulterFunction(`public/upload/images/series_product_master/marvel`).single(
    'image'
  ),
  updateMarvelDetails
);
router.post('/list-marvel', AuthMiddleware, fetchMarvelList);
router.get('/list-single-marvel/:id', AuthMiddleware, fetchSingleMarvel);

//Without Permission
router.get('/dropdown-marvel', AuthMiddleware, dropdownMarvel);

export default router;
