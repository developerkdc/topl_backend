import express from 'express';
import {
  add_flitch_inventory,
  add_single_flitch_item_inventory,
  edit_flitch_invoice_inventory,
  edit_flitch_item_inventory,
  edit_flitch_item_invoice_inventory,
  flitch_item_listing_by_invoice,
  flitchLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_flitch_inventory,
} from '../../../controllers/inventory/flitch/flitch.controller.js';
import RolesPermissions from '../../../middlewares/permission.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
const flitch_router = express.Router();

flitch_router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'view'),
  listing_flitch_inventory
);
flitch_router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'create'),
  add_flitch_inventory
);
flitch_router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'create'),
  add_single_flitch_item_inventory
);
flitch_router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'edit'),
  edit_flitch_item_inventory
);
flitch_router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'edit'),
  edit_flitch_invoice_inventory
);
flitch_router.post(
  '/download-excel-flitch-logs',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'view'),
  flitchLogsCsv
);
flitch_router.get(
  '/flitch-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'edit'),
  flitch_item_listing_by_invoice
);

flitch_router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('flitch_inventory', 'edit'),
  verifyApproval('flitch_inventory', 'edit'),
  edit_flitch_item_invoice_inventory
);
//Dropdowns
flitch_router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
flitch_router.get(
  '/inward-srno-dropdown',
  AuthMiddleware,
  inward_sr_no_dropdown
);

export default flitch_router;
