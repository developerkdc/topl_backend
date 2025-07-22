import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { fetch_all_raw_ready_for_packing } from '../../../controllers/packing/issue_for_packing/raw_ready_for_packing/raw_ready_for_packing.controller.js';
import {
  add_finished_ready_for_packing,
  fetch_all_finished_ready_for_packing,
  fetch_issue_for_packing_items_by_customer_and_order_category,
  revert_finished_ready_for_packing,
} from '../../../controllers/packing/issue_for_packing/finished_ready_for_packing/finished_ready_for_packing.controller.js';
const issue_for_packing_router = Router();

//list all finished items ready for packing
issue_for_packing_router.post(
  '/list-finished-ready-for-packing',
  AuthMiddleware,
  fetch_all_finished_ready_for_packing
);
//add finished item ready for packing
issue_for_packing_router.post(
  '/issue-finished-item-for-packing',
  AuthMiddleware,
  add_finished_ready_for_packing
);
//revert finished item ready for packing
issue_for_packing_router.post(
  '/revert-finished-item-for-packing/:id',
  AuthMiddleware,
  revert_finished_ready_for_packing
);

//list all raw items ready for packing
issue_for_packing_router.post(
  '/list-raw-ready-for-packing',
  AuthMiddleware,
  fetch_all_raw_ready_for_packing
);

issue_for_packing_router.get(
  '/fetch-issue-for-packing-items',
  AuthMiddleware,
  fetch_issue_for_packing_items_by_customer_and_order_category
);

export default issue_for_packing_router;
