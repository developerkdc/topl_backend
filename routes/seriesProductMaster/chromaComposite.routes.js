import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addChromaComposite,
  dropdownChromaComposite,
  fetchChromaCompositeList,
  fetchSingleChromaComposite,
  updateChromaCompositeDetails, updateStatus
} from '../../controllers/seriesProductMaster/chromaComposite.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-chromaComposite',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/chroma_composite`
  ).single('image'),
  addChromaComposite
);
router.post(
  '/update-chromaComposite/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/chroma_composite`
  ).single('image'),
  updateChromaCompositeDetails
);
router.post('/list-chromaComposite', AuthMiddleware, fetchChromaCompositeList);
router.patch('/update-chromaComposite-status', AuthMiddleware, updateStatus);
router.get(
  '/list-chromaComposite/:id',
  AuthMiddleware,
  fetchSingleChromaComposite
);
router.get('/dropdown-chromaComposite', dropdownChromaComposite);

export default router;
