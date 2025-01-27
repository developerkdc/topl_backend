import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addCanvas,
  dropdownCanvas,
  fetchCanvasList,
  fetchSingleCanvas,
  updateCanvasDetails,
} from '../../controllers/seriesProductMaster/canvas.master.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';
const router = Router();

router.post('/add-canvas', AuthMiddleware, MulterFunction(`public/upload/images/series_product_master/canvas`).single('image'), addCanvas);
router.post('/update-canvas/:id', AuthMiddleware, MulterFunction(`public/upload/images/series_product_master/canvas`).single('image'), updateCanvasDetails);
router.post('/list-canvas', AuthMiddleware, fetchCanvasList);
router.get('/list-canvas/:id', AuthMiddleware, fetchSingleCanvas);
router.get('/dropdown-canvas', dropdownCanvas);

export default router;
