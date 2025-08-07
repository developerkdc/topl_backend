import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  create_challan,
  edit_challan_details,
  listing_challan_done,
  update_inward_challan_status_by_challan_id,
  listing_single_challan,
} from '../../../controllers/challan/challan_done/challan_done.controller.js';
const challan_done_router = Router();

challan_done_router.post('/create', AuthMiddleware, create_challan);
challan_done_router.post('/edit/:id', AuthMiddleware, edit_challan_details);
challan_done_router.post('/list', AuthMiddleware, listing_challan_done);
challan_done_router.post(
  '/inward-challan/:id',
  AuthMiddleware,
  update_inward_challan_status_by_challan_id
);
challan_done_router.get(
  '/fetch-single-challan/:id',
  AuthMiddleware,
  listing_single_challan
);
export default challan_done_router;
