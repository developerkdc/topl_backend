import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addChromaRibbed,
  dropdownChromaRibbed,
  fetchChromaRibbedList,
  fetchSingleChromaRibbed,
  updateChromaRibbedDetails,
} from '../../controllers/seriesProductMaster/chromaRibbed.master.controller.js';
const router = Router();

router.post('/add-chromaRibbed', AuthMiddleware, addChromaRibbed);
router.post(
  '/update-chromaRibbed/:id',
  AuthMiddleware,
  updateChromaRibbedDetails
);
router.post('/list-chromaRibbed', AuthMiddleware, fetchChromaRibbedList);
router.get('/list-chromaRibbed/:id', AuthMiddleware, fetchSingleChromaRibbed);

// Without permissions
router.get('/dropdown-chromaRibbed', dropdownChromaRibbed);

export default router;
