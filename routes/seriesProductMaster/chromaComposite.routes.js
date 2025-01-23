import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addChromaComposite,
  dropdownChromaComposite,
  fetchChromaCompositeList,
  fetchSingleChromaComposite,
  updateChromaCompositeDetails,
} from '../../controllers/seriesProductMaster/chromaComposite.master.controller.js';
const router = Router();

router.post('/add-chromaComposite', AuthMiddleware, addChromaComposite);
router.post(
  '/update-chromaComposite/:id',
  AuthMiddleware,
  updateChromaCompositeDetails
);
router.post('/list-chromaComposite', AuthMiddleware, fetchChromaCompositeList);
router.get(
  '/list-chromaComposite/:id',
  AuthMiddleware,
  fetchSingleChromaComposite
);
router.get('/dropdown-chromaComposite', dropdownChromaComposite);

export default router;
