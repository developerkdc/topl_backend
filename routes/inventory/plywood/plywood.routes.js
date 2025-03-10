import { Router } from 'express';
import {
  add_plywood_inventory,
  add_single_plywood_item_inventory,
  edit_plywood_invoice_inventory,
  edit_plywood_item_inventory,
  edit_plywood_item_invoice_inventory,
  listing_plywood_inventory,
  plywood_item_listing_by_invoice,
  plywoodLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
} from '../../../controllers/inventory/plywood/plywood.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
import { fetch_all_plywood_no_item_name, fetch_plywood_details_by_id } from '../../../controllers/inventory/plywood/plywood_issue_for_order.controller.js';

const router = Router();

// router.post("/add-inventory", CheckRoleAndTokenAccess, add_plywood_inventory);
// router.patch(
//   "/edit-inventory/:item_id/:invoice_id",
//   CheckRoleAndTokenAccess,
//   edit_plywood_inventory
// );
// router.get(
//   "/list-inventory",
//   CheckRoleAndTokenAccess,
//   listing_plywood_inventory
// );
router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'view'),
  listing_plywood_inventory
);
router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'create'),
  add_plywood_inventory
);
router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'create'),
  add_single_plywood_item_inventory
);
router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'create'),
  edit_plywood_item_inventory
);
router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'edit'),
  edit_plywood_invoice_inventory
);
router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'edit'),
  verifyApproval('plywood_inventory', 'edit'),
  edit_plywood_item_invoice_inventory
);
router.get(
  '/plywood-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'edit'),
  plywood_item_listing_by_invoice
);
router.post(
  '/download-excel-plywood',
  AuthMiddleware,
  RolesPermissions('plywood_inventory', 'view'),
  plywoodLogsCsv
);
router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
router.get('/inward-srno-dropdown', AuthMiddleware, inward_sr_no_dropdown);



// pallete no dropdown 

router.get('/pallet-no-dropdown/:id', AuthMiddleware , fetch_all_plywood_no_item_name);

//list plywood details
router.get('/list-plywood-details/:id', AuthMiddleware,fetch_plywood_details_by_id);

export default router;
