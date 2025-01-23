import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addFurrowReganto, dropdownFurrowReganto, fetchFurrowRegantoList, fetchSingleFurrowReganto, updateFurrowRegantoDetails
} from '../../controllers/seriesProductMaster/furrow.reganto.master.controller.js';
const router = Router();

router.post('/add-furrow-reganto', AuthMiddleware, addFurrowReganto);
router.post('/update-furrow-reganto/:id', AuthMiddleware, updateFurrowRegantoDetails);
router.post('/list-furrow-reganto', AuthMiddleware, fetchFurrowRegantoList);
router.get('/list-single-furrow-reganto/:id', AuthMiddleware, fetchSingleFurrowReganto);

//without permission
router.get('/dropdown-furrow-reganto', AuthMiddleware, dropdownFurrowReganto);

export default router;
