import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addNovel,
  dropdownNovel,
  fetchNovelList,
  fetchSingleNovel,
  updateNovelDetails,
} from '../../controllers/seriesProductMaster/novel.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post('/add-novel', AuthMiddleware, MulterFunction(`public/upload/images/series_product_master/novel`).single('image'), addNovel);
router.post('/update-novel/:id', AuthMiddleware, MulterFunction(`public/upload/images/series_product_master/novel`).single('image'), updateNovelDetails);
router.post('/list-novel', AuthMiddleware, fetchNovelList);
router.get('/list-single-novel/:id', AuthMiddleware, fetchSingleNovel);

//without permission
router.get('/dropdown-novel', AuthMiddleware, dropdownNovel);

export default router;
