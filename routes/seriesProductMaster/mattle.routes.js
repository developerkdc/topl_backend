import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addMattle,
  dropdownMattle,
  fetchMattleList,
  fetchSingleMattle,
  updateMattleDetails,
  updateStatus,
} from '../../controllers/seriesProductMaster/mattle.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post(
  '/add-mattle',
  AuthMiddleware,
  MulterFunction(`public/upload/images/series_product_master/mattle`).single(
    'image'
  ),
  addMattle
);
router.post(
  '/update-mattle/:id',
  AuthMiddleware,
  MulterFunction(`public/upload/images/series_product_master/mattle`).single(
    'image'
  ),
  updateMattleDetails
);
router.post('/list-mattle', AuthMiddleware, fetchMattleList);
router.get('/list-single-mattle/:id', AuthMiddleware, fetchSingleMattle);
router.patch('/update-mattle-status', AuthMiddleware, updateStatus);

//without permission
router.get('/dropdown-mattle', AuthMiddleware, dropdownMattle);

export default router;
