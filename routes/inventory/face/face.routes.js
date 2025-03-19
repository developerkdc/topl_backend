import express from 'express';
import {
  add_face_inventory,
  add_single_face_item_inventory,
  edit_face_invoice_inventory,
  edit_face_item_inventory,
  edit_face_item_invoice_inventory,
  face_item_listing_by_invoice,
  faceLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_face_inventory,
  fetch_face_history,
} from '../../../controllers/inventory/face/face.controller.js';
import {
  fetch_all_face_inward_sr_no_by_order_item_name,
  fetch_all_face_sr_no_by_inward_sr_no,
  fetch_face_details_by_id,
} from '../../../controllers/inventory/face/face.issue_for_order.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
const router = express.Router();
router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'view'),
  listing_face_inventory
);
router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'create'),
  add_face_inventory
);
router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'create'),
  add_single_face_item_inventory
);
router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'edit'),
  edit_face_item_inventory
);
router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'edit'),
  edit_face_invoice_inventory
);
router.get(
  '/face-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'edit'),
  face_item_listing_by_invoice
);
router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'edit'),
  verifyApproval('face_inventory', 'edit'),
  edit_face_item_invoice_inventory
);
router.post(
  '/download-excel-face',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'view'),
  faceLogsCsv
);
//face history
router.post(
  '/list-face-history',
  AuthMiddleware,
  RolesPermissions('face_inventory', 'view'),
  fetch_face_history
);
//dropdown
router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
router.get('/inward-srno-dropdown', AuthMiddleware, inward_sr_no_dropdown);

//order dropdowns
router.get(
  '/inward-sr-no-dropdown',
  AuthMiddleware,
  fetch_all_face_inward_sr_no_by_order_item_name
);
router.get(
  '/item-sr-no-dropdown/:id/:order_id',
  AuthMiddleware,
  fetch_all_face_sr_no_by_inward_sr_no
);
router.get('/list-face-details/:id', AuthMiddleware, fetch_face_details_by_id);

export default router;
