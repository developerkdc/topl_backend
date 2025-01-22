import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addMattle, dropdownMattle, fetchMattleList, fetchSingleMattle, updateMattleDetails
} from '../../controllers/seriesProductMaster/mattle.master.controller.js';
const router = Router();

router.post('/add-mattle', AuthMiddleware, addMattle);
router.post('/update-mattle/:id', AuthMiddleware, updateMattleDetails);
router.post('/list-mattle', AuthMiddleware, fetchMattleList);
router.get('/list-single-mattle/:id', AuthMiddleware, fetchSingleMattle);


//without permission
router.get('/dropdown-mattle', AuthMiddleware, dropdownMattle);

export default router;
