import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addAcco,
  dropdownAcco,
  fetchAccoList,
  fetchSingleAcco,
  updateAccoDetails,
} from '../../controllers/seriesProductMaster/acco.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-acco',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/acco_master`
  ).single('image'),
  addAcco
);
router.post(
  '/update-acco/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/acco_master`
  ).single('image'),
  updateAccoDetails
);
router.post('/list-acco', AuthMiddleware, fetchAccoList);
router.get('/list-single-acco/:id', AuthMiddleware, fetchSingleAcco);

//without permission
router.get('/dropdown-acco', AuthMiddleware, dropdownAcco);

export default router;
