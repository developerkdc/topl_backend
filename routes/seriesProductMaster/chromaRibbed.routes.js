import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addChromaRibbed,
  dropdownChromaRibbed,
  fetchChromaRibbedList,
  fetchSingleChromaRibbed,
  updateChromaRibbedDetails,
} from '../../controllers/seriesProductMaster/chromaRibbed.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post('/add-chromaRibbed', AuthMiddleware, MulterFunction(`public/upload/images/series_product_master/chroma_ribbed`).single('image'), addChromaRibbed);
router.post(
  '/update-chromaRibbed/:id',
  AuthMiddleware, MulterFunction(`public/upload/images/series_product_master/chroma_ribbed`).single('image'),
  updateChromaRibbedDetails
);
router.post('/list-chromaRibbed', AuthMiddleware, fetchChromaRibbedList);
router.get('/list-chromaRibbed/:id', AuthMiddleware, fetchSingleChromaRibbed);

// Without permissions
router.get('/dropdown-chromaRibbed', dropdownChromaRibbed);

export default router;
