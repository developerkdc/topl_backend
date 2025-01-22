import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addBarcode,
  fetchBarcodeList,
  fetchSingleBarcode,
  updateBarcodeDetails,
  dropdownBarcode,
} from '../../controllers/seriesProductMaster/barcode.master.controller.js';
const router = Router();

router.post('/add-barcode', AuthMiddleware, addBarcode);
router.post('/update-barcode/:id', AuthMiddleware, updateBarcodeDetails);
router.post('/list-barcode', AuthMiddleware, fetchBarcodeList);
router.get('/list-single-barcode/:id', AuthMiddleware, fetchSingleBarcode);


//Without Permission
router.get('/dropdown-barcode', AuthMiddleware, dropdownBarcode);

export default router;
