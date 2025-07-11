import express from 'express';
import {
  add_core_inventory,
  add_single_core_item_inventory,
  core_item_listing_by_invoice,
  coreHistoryLogsCsv,
  coreLogsCsv,
  edit_core_invoice_inventory,
  edit_core_item_inventory,
  edit_core_item_invoice_inventory,
  fetch_core_history,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_core_inventory,
} from '../../../controllers/inventory/core/core.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
import {
  fetch_all_core_inward_sr_no_by_order_item_name,
  fetch_all_core_sr_no_by_inward_sr_no,
  fetch_core_details_by_id,
} from '../../../controllers/inventory/core/core.issue_for_order.controller.js';
import {
  fetch_all_core_inward_sr_no_for_plywood_production,
  fetch_all_core_sr_no_by_inward_sr_no_for_plywood_production,
} from '../../../controllers/inventory/core/core_plywood_production.controller.js';
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
router.post(
  '/download-history-excel-core',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'view'),
  coreHistoryLogsCsv
);

//dropdown
router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
router.get('/inward-srno-dropdown', AuthMiddleware, inward_sr_no_dropdown);

//order dropdowns
router.get(
  '/inward-sr-no-dropdown/:id',
  AuthMiddleware,
  fetch_all_core_inward_sr_no_by_order_item_name
);
router.get(
  '/item-sr-no-dropdown/:id/:order_id',
  AuthMiddleware,
  fetch_all_core_sr_no_by_inward_sr_no
);
router.get('/list-core-details/:id', AuthMiddleware, fetch_core_details_by_id);

//Core inventory list history
router.post(
  '/list-core-history',
  AuthMiddleware,
  RolesPermissions('core_inventory', 'view'),
  fetch_core_history
);
//plywood production
router.get(
  '/inward-sr-no-dropdown',
  AuthMiddleware,
  fetch_all_core_inward_sr_no_for_plywood_production
);
router.get(
  '/item-sr-no-dropdown/:id',
  AuthMiddleware,
  fetch_all_core_sr_no_by_inward_sr_no_for_plywood_production
);

export default router;
