import { Router } from 'express';
import {
  add_issue_for_crosscutting,
  add_issue_for_flitching,
  add_log_inventory,
  add_single_log_item_inventory,
  check_already_existing_log_no,
  edit_log_invoice_inventory,
  edit_log_item_inventory,
  edit_log_item_invoice_inventory,
  historyLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_log_history_inventory,
  listing_log_inventory,
  log_invoice_listing,
  log_item_listing_by_invoice,
  logLogsCsv,
} from '../../../controllers/inventory/log/log.controller.js';

import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
import {
  fetch_all_log_no_item_name,
  fetch_log_details_by_log_no,
} from '../../../controllers/inventory/log/log_issue_for_order.controller.js';

const router = Router();

router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'view'),
  listing_log_inventory
);
router.post(
  '/list-history-inventory',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'view'),
  listing_log_history_inventory
);
router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'create'),
  add_log_inventory
);
router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'create'),
  add_single_log_item_inventory
);
router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'edit'),
  verifyApproval('log_inventory', 'edit'),
  edit_log_item_invoice_inventory
);
router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'edit'),
  edit_log_item_inventory
);
router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'edit'),
  edit_log_invoice_inventory
);
router.post(
  '/download-excel-log-logs',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'view'),
  logLogsCsv
);

router.post(
  '/download-excel-log-history',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'view'),
  historyLogsCsv
);

router.post(
  '/log-invoice-listing',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'edit'),
  log_invoice_listing
);
router.get(
  '/log-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'edit'),
  log_item_listing_by_invoice
);

//dropdown
router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
router.get('/inward-srno-dropdown', AuthMiddleware, inward_sr_no_dropdown);

router.get(
  '/list-log-details/:id',
  AuthMiddleware,
  fetch_log_details_by_log_no
);
//log no dropdown by order item id
router.get('/log-no-dropdown/:id', AuthMiddleware, fetch_all_log_no_item_name);

//Issue for crosscutting
router.post(
  '/issue_for_crosscutting',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'view'),
  add_issue_for_crosscutting
);
//Issue for flitching
router.post(
  '/issue_for_flitching',
  AuthMiddleware,
  RolesPermissions('log_inventory', 'view'),
  add_issue_for_flitching
);

// validate log no already exist api
router.get(
  '/check_log_no_already_exist',
  AuthMiddleware,
  check_already_existing_log_no
);

export default router;
