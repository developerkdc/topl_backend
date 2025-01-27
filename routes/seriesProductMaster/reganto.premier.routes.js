import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
  addRegantoPremier,
  dropdownRegantoPremier,
  fetchRegantoPremierList,
  fetchSingleRegantoPremier,
  updateRegantoPremierDetails,
} from '../../controllers/seriesProductMaster/reganto.premier.controller.js';
import { MulterFunction } from '../../config/multer/multer.js';

const router = Router();

router.post(
  '/add-reganto-premier',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/reganto_premier`
  ).single('image'),
  addRegantoPremier
);
router.post(
  '/update-reganto-premier/:id',
  AuthMiddleware,
  MulterFunction(
    `public/upload/images/series_product_master/reganto_premier`
  ).single('image'),
  updateRegantoPremierDetails
);
router.post('/list-reganto-premier', AuthMiddleware, fetchRegantoPremierList);
router.get(
  '/list-single-reganto-premier/:id',
  AuthMiddleware,
  fetchSingleRegantoPremier
);

//without permission
router.get('/dropdown-reganto-premier', AuthMiddleware, dropdownRegantoPremier);

export default router;
