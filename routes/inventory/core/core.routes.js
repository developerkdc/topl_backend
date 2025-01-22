import express from 'express';
import {
  add_core_inventory,
  add_single_core_item_inventory,
  core_item_listing_by_invoice,
  coreLogsCsv,
  edit_core_invoice_inventory,
  edit_core_item_inventory,
  edit_core_item_invoice_inventory,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_core_inventory,
} from '../../../controllers/inventory/core/core.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
const router = express.Router();

router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'view'),
  listing_core_inventory
);
router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'create'),
  add_core_inventory
);
router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'create'),
  add_single_core_item_inventory
);
router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'edit'),
  edit_core_item_inventory
);
router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'edit'),
  edit_core_invoice_inventory
);
router.get(
  '/core-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'edit'),
  core_item_listing_by_invoice
);
router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'edit'),
  verifyApproval('core_inventory', 'edit'),
  edit_core_item_invoice_inventory
);
router.post(
  '/download-excel-core',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'view'),
  coreLogsCsv
);

//dropdown
router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
router.get('/inward-srno-dropdown', AuthMiddleware, inward_sr_no_dropdown);
export default router;
