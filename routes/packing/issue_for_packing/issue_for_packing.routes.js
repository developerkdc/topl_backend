import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
const issue_for_packing_router = Router();

//api for finish goods
issue_for_packing_router.post(
  '/list-finished-ready-for-packing',
  AuthMiddleware,
//   listing_issued_for_challan
);
issue_for_packing_router.get(
  '/list-finished-item-for-create-packing',
  AuthMiddleware,
  // list_finished_item_for_create_packing
);


//api for raw goods
issue_for_packing_router.post(
  '/list-raw-ready-for-packing',
  AuthMiddleware,
//   listing_issued_for_challan
);
issue_for_packing_router.get(
  '/list-raw-item-for-create-packing',
  AuthMiddleware,
  // list_raw_item_for_create_packing
);

export default issue_for_packing_router;
