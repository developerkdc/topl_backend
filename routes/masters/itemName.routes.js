import express from 'express';
import bulk from '../../config/bulkUpload/bulk.js';
import {
  AddItemNameMaster,
  BulkUploadItemMaster,
  DropdownItemNameMaster,
  ListItemNameMaster,
  UpdateItemNameMaster,
} from '../../controllers/masters/itemName.js';
import { ListItemNameLogs } from '../../controllers/logs/Masters/itemNameLogs.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';

const router = express.Router();

router.post(
  '/add-item-name-master',
  AuthMiddleware,
  RolesPermissions('item_name_master', 'create'),
  AddItemNameMaster
);
router.post(
  '/bulk-upload-item-master',
  AuthMiddleware,
  RolesPermissions('item_name_master', 'create'),
  bulk('/item_master_bulk_upload').single('excelFile'),
  BulkUploadItemMaster
);

router.post(
  '/update-item-name-master',
  AuthMiddleware,
  RolesPermissions('item_name_master', 'edit'),
  UpdateItemNameMaster
);
router.post(
  '/list-item-name-master',
  AuthMiddleware,
  RolesPermissions('item_name_master', 'view'),
  ListItemNameMaster
);
// router.get("/itemNames-logs", ListItemNameLogs);

// without permission
router.get(
  '/dropdown-item-name-master',
  AuthMiddleware,
  DropdownItemNameMaster
);

export default router;
