import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addRegantoPremier, dropdownRegantoPremier, fetchRegantoPremierList, fetchSingleRegantoPremier, updateRegantoPremierDetails
} from '../../controllers/seriesProductMaster/reganto.premier.controller.js';
const router = Router();

router.post('/add-reganto-premier', AuthMiddleware, addRegantoPremier);
router.post('/update-reganto-premier/:id', AuthMiddleware, updateRegantoPremierDetails);
router.post('/list-reganto-premier', AuthMiddleware, fetchRegantoPremierList);
router.get('/list-single-reganto-premier/:id', AuthMiddleware, fetchSingleRegantoPremier);


//without permission
router.get('/dropdown-reganto-premier', AuthMiddleware, dropdownRegantoPremier);

export default router;
