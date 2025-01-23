import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addAcco, dropdownAcco, fetchAccoList, fetchSingleAcco, updateAccoDetails
} from '../../controllers/seriesProductMaster/acco.master.controller.js';
const router = Router();

router.post('/add-acco', AuthMiddleware, addAcco);
router.post('/update-acco/:id', AuthMiddleware, updateAccoDetails);
router.post('/list-acco', AuthMiddleware, fetchAccoList);
router.get('/list-single-acco/:id', AuthMiddleware, fetchSingleAcco);

//without permission
router.get('/dropdown-acco', AuthMiddleware, dropdownAcco);

export default router;
