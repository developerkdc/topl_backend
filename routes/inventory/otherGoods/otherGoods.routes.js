import express from 'express';
import {
  add_otherGoods_inventory,
  add_single_otherGoods_item_inventory,
  edit_otherGoods_invoice_inventory,
  edit_otherGoods_item_inventory,
  edit_othergoods_item_invoice_inventory,
  listing_otherGodds_inventory,
  othergoods_item_listing_by_invoice,
  otherGoodsLogsCsv,
  inward_sr_no_dropdown,
  item_sr_no_dropdown,
  fetch_other_goods_history,
  otherGoodsLogsCsvHistory,
  otherGoodsStockReportCsv,
  // otherGoodsLogsCsvHistory,
} from '../../../controllers/inventory/otherGoods/otherGoods.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import RolesPermissions from '../../../middlewares/permission.js';
import { verifyApproval } from '../../../middlewares/approval.middleware.js';
import {
  fetch_all_other_goods_inward_sr_no_by_order_item_name,
  fetch_all_other_goods_sr_no_by_inward_sr_no,
  fetch_other_goods_details_by_id,
} from '../../../controllers/inventory/otherGoods/other_goods.issue_for_order.controller.js';
const router = express.Router();

router.post(
  '/list-inventory',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'view'),
  listing_otherGodds_inventory
);
router.post(
  '/add-inventory',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'create'),
  add_otherGoods_inventory
);
router.post(
  '/add-item-inventory',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'create'),
  add_single_otherGoods_item_inventory
);
router.patch(
  '/edit-item-inventory/:item_id',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'edit'),
  edit_otherGoods_item_inventory
);
router.patch(
  '/edit-invoice-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'edit'),
  edit_otherGoods_invoice_inventory
);
router.patch(
  '/edit-invoice-item-inventory/:invoice_id',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'edit'),
  verifyApproval('otherGoods_inventory', 'edit'),
  edit_othergoods_item_invoice_inventory
);
router.get(
  '/othergoods-item-listing-by-invoice/:invoice_id',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'edit'),
  othergoods_item_listing_by_invoice
);
router.post(
  '/download-excel-othergoods-logs',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'view'),
  otherGoodsLogsCsv
);

router.post(
  '/download-excel-othergoods-history',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'view'),
  otherGoodsLogsCsvHistory
);

router.post(
  '/download-stock-report-othergoods',
  // AuthMiddleware,
  // RolesPermissions('other_goods_inventory', 'view'),
  otherGoodsStockReportCsv
);

router.get('/item-srno-dropdown', AuthMiddleware, item_sr_no_dropdown);
router.get('/inward-srno-dropdown', AuthMiddleware, inward_sr_no_dropdown);

//order dropdowns
router.get(
  '/inward-sr-no-dropdown/:id',
  AuthMiddleware,
  fetch_all_other_goods_inward_sr_no_by_order_item_name
);
router.get(
  '/item-sr-no-dropdown/:id/:order_id',
  AuthMiddleware,
  fetch_all_other_goods_sr_no_by_inward_sr_no
);
router.get(
  '/list-details/:id',
  AuthMiddleware,
  fetch_other_goods_details_by_id
);

//history

router.post(
  '/list-history',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'view'),
  fetch_other_goods_history
);
export default router;
