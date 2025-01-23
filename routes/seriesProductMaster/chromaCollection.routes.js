import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addChromaCollection,
  dropdownChromaCollection,
  fetchChromaCollectionList,
  fetchSingleChromaCollection,
  updateChromaCollectionDetails,
} from '../../controllers/seriesProductMaster/chromaCollection.master.controller.js';
const router = Router();

router.post('/add-chromaCollection', AuthMiddleware, addChromaCollection);
router.post(
  '/update-chromaCollection/:id',
  AuthMiddleware,
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
router.get('/dropdown-chromaCollection', dropdownChromaCollection);

export default router;
