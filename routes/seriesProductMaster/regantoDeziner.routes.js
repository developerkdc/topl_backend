import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addRegantoDeziner,
  dropdownRegantoDeziner,
  fetchRegantoDezinerList,
  fetchSingleRegantoDeziner,
  updateRegantoDezinerDetails,
  updateStatus,
} from '../../controllers/seriesProductMaster/regantoDeziner.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';

const router = Router();

router.post(
  '/add-regantoDeziner',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/reganto_deziner`
  ).single('image'),
  addRegantoDeziner
);
router.post(
  '/update-regantoDeziner/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/reganto_deziner`
  ).single('image'),
  updateRegantoDezinerDetails
);
router.post('/list-regantoDeziner', AuthMiddleware, fetchRegantoDezinerList);
router.get(
  '/list-regantoDeziner/:id',
  AuthMiddleware,
  fetchSingleRegantoDeziner
);
router.patch('/update-regantoDeziner-status', AuthMiddleware, updateStatus);
router.get('/dropdown-regantoDeziner', dropdownRegantoDeziner);

export default router;
