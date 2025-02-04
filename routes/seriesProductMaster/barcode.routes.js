import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addBarcode,
  fetchBarcodeList,
  fetchSingleBarcode,
  updateBarcodeDetails,
  dropdownBarcode, updateBarcodeStatus
} from '../../controllers/seriesProductMaster/barcode.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-barcode',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/barcode_images`
  ).single('image'),
  addBarcode
);
router.post(
  '/update-barcode/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/barcode_images`
  ).single('image'),
  updateBarcodeDetails
);
router.post('/list-barcode', AuthMiddleware, fetchBarcodeList);
router.get('/list-single-barcode/:id', AuthMiddleware, fetchSingleBarcode);
router.patch('/update-barcode-status', AuthMiddleware, updateBarcodeStatus);

//Without Permission
router.get('/dropdown-barcode', AuthMiddleware, dropdownBarcode);

export default router;
