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
  get_ewaybill_details,
  update_ewaybill_transporter,
  update_ewaybill_partB,
} from '../../../controllers/challan/challan_done/challan_done.controller.js';
import EwayBillAuthMiddleware from '../../../middlewares/ewaybillAuth.middleware.js';
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
challan_done_router.post(
  '/generate-ewaybill/:id',
  AuthMiddleware,
  EwayBillAuthMiddleware,
  generate_challan_ewaybill
);
challan_done_router.post(
  '/cancel-ewaybill/:id',
  AuthMiddleware,
  EwayBillAuthMiddleware,
  cancel_challan_ewaybill
);
challan_done_router.post(
  '/get-ewaybill/:id',
  AuthMiddleware,
  EwayBillAuthMiddleware,
  get_ewaybill_details
);
challan_done_router.post(
  '/update-ewaybill-transporter/:id',
  AuthMiddleware,
  EwayBillAuthMiddleware,
  update_ewaybill_transporter
);
challan_done_router.post(
  '/update-ewaybill-partB/:id',
  AuthMiddleware,
  EwayBillAuthMiddleware,
  update_ewaybill_partB
);
export default challan_done_router;
