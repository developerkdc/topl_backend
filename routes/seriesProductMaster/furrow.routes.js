import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addFurrow,
    dropdownFurrow,
    fetchFurrowList,
    fetchSingleFurrow,
    updateFurrowDetails,
} from '../../controllers/seriesProductMaster/furrow.master.controller.js';
const router = Router();

router.post('/add-furrow', AuthMiddleware, addFurrow);
router.post('/update-furrow/:id', AuthMiddleware, updateFurrowDetails);
router.post('/list-furrow', AuthMiddleware, fetchFurrowList);
router.get('/list-single-furrow/:id', AuthMiddleware, fetchSingleFurrow);

//without permission
router.get('/dropdown-furrow', AuthMiddleware, dropdownFurrow);

export default router;
