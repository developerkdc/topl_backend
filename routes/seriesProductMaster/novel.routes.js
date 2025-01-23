import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addNovel,
  dropdownNovel,
  fetchNovelList,
  fetchSingleNovel,
  updateNovelDetails,
} from '../../controllers/seriesProductMaster/novel.master.controller.js';
const router = Router();

router.post('/add-novel', AuthMiddleware, addNovel);
router.post('/update-novel/:id', AuthMiddleware, updateNovelDetails);
router.post('/list-novel', AuthMiddleware, fetchNovelList);
router.get('/list-single-novel/:id', AuthMiddleware, fetchSingleNovel);

//without permission
router.get('/dropdown-novel', AuthMiddleware, dropdownNovel);

export default router;
