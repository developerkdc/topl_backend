import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addFurrowLite, dropdownFurrowLite, fetchFurrowLiteList, fetchSingleFurrowLite, updateFurrowLiteDetails
} from '../../controllers/seriesProductMaster/furrow.lite.master.controller.js';
const router = Router();

router.post('/add-furrow-lite', AuthMiddleware, addFurrowLite);
router.post('/update-furrow-lite/:id', AuthMiddleware, updateFurrowLiteDetails);
router.post('/list-furrow-lite', AuthMiddleware, fetchFurrowLiteList);
router.get('/list-single-furrow-lite/:id', AuthMiddleware, fetchSingleFurrowLite);

//without permission
router.get('/dropdown-furrow-lite', AuthMiddleware, dropdownFurrowLite);

export default router;
