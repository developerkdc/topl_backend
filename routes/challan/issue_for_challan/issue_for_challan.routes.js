import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  add_issue_for_challan_data,
  revert_issued_challan_data_by_id,
  fetch_single_issued_for_challan_item,
  listing_issued_for_challan, fetch_all_items_by_raw_material
} from '../../../controllers/challan/issue_for_challan/issue_for_challan.controller.js';
const issue_for_challan_router = Router();

issue_for_challan_router.post(
  '/issue',
  AuthMiddleware,
  add_issue_for_challan_data
);
issue_for_challan_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_issued_challan_data_by_id
);
issue_for_challan_router.post(
  '/list',
  AuthMiddleware,
  listing_issued_for_challan
);
issue_for_challan_router.get(
  '/fetch-single-issue-for-challan/:id',
  AuthMiddleware,
  fetch_single_issued_for_challan_item
);
issue_for_challan_router.get('/fetch-challan-items-by-raw-material', AuthMiddleware, fetch_all_items_by_raw_material)
export default issue_for_challan_router;
