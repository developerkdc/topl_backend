import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addBunito,
  dropdownBunito,
  fetchBunitoList,
  fetchSingleBunito,
  updateBunitoDetails,
} from '../../controllers/seriesProductMaster/bunito.master.controller.js';
const router = Router();

router.post('/add-bunito', AuthMiddleware, addBunito);
router.post('/update-bunito/:id', AuthMiddleware, updateBunitoDetails);
router.post('/list-bunito', AuthMiddleware, fetchBunitoList);
router.get('/list-single-bunito/:id', AuthMiddleware, fetchSingleBunito);

//without permission
router.get('/dropdown-bunito', AuthMiddleware, dropdownBunito);

export default router;
