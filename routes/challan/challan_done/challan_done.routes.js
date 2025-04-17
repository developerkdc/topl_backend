import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  create_challan,
  edit_challan_details,
  listing_challan_done,
} from '../../../controllers/challan/challan_done/challan_done.controller.js';
const challan_done_router = Router();

challan_done_router.post('/create', AuthMiddleware, create_challan);
challan_done_router.post('/edit/:id', AuthMiddleware, edit_challan_details);
challan_done_router.post('/list', AuthMiddleware, listing_challan_done);
export default challan_done_router;
