import { Router } from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import {
    addMarvel, dropdownMarvel, fetchMarvelList, fetchSingleMarvel, updateMarvelDetails
} from '../../controllers/seriesProductMaster/marvel.master.controller.js';
const router = Router();

router.post('/add-marvel', AuthMiddleware, addMarvel);
router.post('/update-marvel/:id', AuthMiddleware, updateMarvelDetails);
router.post('/list-marvel', AuthMiddleware, fetchMarvelList);
router.get('/list-single-marvel/:id', AuthMiddleware, fetchSingleMarvel);


//Without Permission
router.get('/dropdown-marvel', AuthMiddleware, dropdownMarvel);

export default router;
