import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addRegantoDeziner,
  dropdownRegantoDeziner,
  fetchRegantoDezinerList,
  fetchSingleRegantoDeziner,
  updateRegantoDezinerDetails,
} from '../../controllers/seriesProductMaster/regantoDeziner.master.controller.js';
const router = Router();

router.post('/add-regantoDeziner', AuthMiddleware, addRegantoDeziner);
router.post(
  '/update-regantoDeziner/:id',
  AuthMiddleware,
  updateRegantoDezinerDetails
);
router.post('/list-regantoDeziner', AuthMiddleware, fetchRegantoDezinerList);
router.get(
  '/list-regantoDeziner/:id',
  AuthMiddleware,
  fetchSingleRegantoDeziner
);
router.get('/dropdown-regantoDeziner', dropdownRegantoDeziner);

export default router;
