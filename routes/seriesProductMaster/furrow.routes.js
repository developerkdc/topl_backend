import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addFurrow,
  dropdownFurrow,
  fetchFurrowList,
  fetchSingleFurrow,
  updateFurrowDetails,
} from '../../controllers/seriesProductMaster/furrow.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-furrow',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/furrow_master`
  ).single('image'),
  addFurrow
);
router.post(
  '/update-furrow/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/furrow_master`
  ).single('image'),
  updateFurrowDetails
);
router.post('/list-furrow', AuthMiddleware, fetchFurrowList);
router.get('/list-single-furrow/:id', AuthMiddleware, fetchSingleFurrow);

//without permission
router.get('/dropdown-furrow', AuthMiddleware, dropdownFurrow);

export default router;
