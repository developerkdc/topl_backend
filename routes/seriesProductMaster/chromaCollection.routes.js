import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addChromaCollection,
  dropdownChromaCollection,
  fetchChromaCollectionList,
  fetchSingleChromaCollection,
  updateChromaCollectionDetails,
  updateStatus,
} from '../../controllers/seriesProductMaster/chromaCollection.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-chromaCollection',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/chroma_collection`
  ).single('image'),
  addChromaCollection
);
router.post(
  '/update-chromaCollection/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/chroma_collection`
  ).single('image'),
  updateChromaCollectionDetails
);
router.post(
  '/list-chromaCollection',
  AuthMiddleware,
  fetchChromaCollectionList
);
router.get(
  '/list-chromaCollection/:id',
  AuthMiddleware,
  fetchSingleChromaCollection
);
router.patch('/update-chromaCollection-status', AuthMiddleware, updateStatus);
router.get('/dropdown-chromaCollection', dropdownChromaCollection);

export default router;
