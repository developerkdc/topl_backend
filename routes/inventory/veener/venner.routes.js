import { Router } from 'express';
import {
  add_veneer_inventory,
  add_single_veneer_item_inventory,
  edit_veneer_invoice_inventory,
  edit_veneer_item_inventory,
  edit_veneer_item_invoice_inventory,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  listing_veneer_inventory,
  veneer_item_listing_by_invoice,
  veneerLogsCsv,
  listing_veneer_history_inventory,
} from '../../../controllers/inventory/venner/venner.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import {
  BulkUploadVeneerData,
  downloadVeneerExcelFormat,
} from '../../../controllers/inventory/venner/Excels/veneerExcels.controller.js';
import multerFunction from '../../../config/bulkUpload/bulk.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
import {
  fetch_all_log_no_by_item_name,
  fetch_all_bundles_by_pallet_number,
  fetch_all_pallet_no_by_log_no,
  fetch_veneer_details_by_bundle_id,
} from '../../../controllers/inventory/venner/veneer.issue_for_order.controller.js';

const veneer_router = Router();

veneer_router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'view'),
  listing_veneer_inventory
);
veneer_router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'create'),
  add_veneer_inventory
);
veneer_router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'create'),
  add_single_veneer_item_inventory
);
veneer_router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'edit'),
  verifyApproval('veneer_inventory', 'edit'),
  edit_veneer_item_invoice_inventory
);
veneer_router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'edit'),
  edit_veneer_item_inventory
);
veneer_router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'edit'),
  edit_veneer_invoice_inventory
);
// veneer_router.post("/download-excel-veneer", veneerCsv);
veneer_router.get(
  '/veneer-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'edit'),
  veneer_item_listing_by_invoice
);
veneer_router.post(
  '/download-excel-veneer',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'view'),
  veneerLogsCsv
);

veneer_router.post(
  '/list-history-inventory',
  AuthMiddleware,
  RolesPermissions('veneer_inventory', 'view'),
  listing_veneer_history_inventory
);

//dropdown
veneer_router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
veneer_router.get(
  '/inward-srno-dropdown',
  AuthMiddleware,
  inward_sr_no_dropdown
);

//Excels
veneer_router.get(
  '/donwload-format',
  AuthMiddleware,
  downloadVeneerExcelFormat
);
veneer_router.post(
  '/importData',
  AuthMiddleware,
  multerFunction('veneerExcels').single('file'),
  BulkUploadVeneerData
);

//order dropdowns
veneer_router.get(
  '/log-no-dropdown/:id',
  AuthMiddleware,
  fetch_all_log_no_by_item_name
);
veneer_router.get(
  '/pallet-no-dropdown/:log_no',
  AuthMiddleware,
  fetch_all_pallet_no_by_log_no
);
veneer_router.get(
  '/bundle-no-dropdown/:pallet_number(*)',
  AuthMiddleware,
  fetch_all_bundles_by_pallet_number
);
veneer_router.get(
  '/list-veneer-details/:id',
  AuthMiddleware,
  fetch_veneer_details_by_bundle_id
);

export default veneer_router;
