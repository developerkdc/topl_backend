import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  create_challan,
  edit_challan_details,
  listing_challan_done,
  update_inward_challan_status_by_challan_id,
  listing_single_challan,
  generate_challan_ewaybill,
  cancel_challan_ewaybill,
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

// Ewaybill related apis
challan_done_router.post("/generate-ewaybill/:id", AuthMiddleware, generate_challan_ewaybill);
challan_done_router.post("/cancel-ewaybill/:id", AuthMiddleware, cancel_challan_ewaybill);
// challan_done_router.post("/get-ewaybill/:id", AuthMiddleware, get_ewaybill_details);
// challan_done_router.post("/update-ewaybill-transporter/:id", AuthMiddleware, update_ewaybill_transporter);
// challan_done_router.post("/update-ewaybill-partB/:id", AuthMiddleware, update_ewaybill_partB);
export default challan_done_router;
