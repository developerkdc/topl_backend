import express from "express";
import bulk from "../../config/bulkUpload/bulk.js";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  AddItemNameMaster,
  BulkUploadItemMaster,
  DropdownItemNameMaster,
  ListItemNameMaster,
  UpdateItemNameMaster,
} from "../../controllers/masters/itemName.js";
import { ListItemNameLogs } from "../../controllers/logs/Masters/itemNameLogs.js";

const router = express.Router();

router.post(
  "/add-item-name-master",
  CheckRoleAndTokenAccess,
  AddItemNameMaster
);
router.post(
  "/bulk-upload-item-master",
  CheckRoleAndTokenAccess,
  bulk("/item_master_bulk_upload").single("excelFile"),
  BulkUploadItemMaster
);

router.post(
  "/update-item-name-master",
  CheckRoleAndTokenAccess,
  UpdateItemNameMaster
);
router.get(
  "/list-item-name-master",
  CheckRoleAndTokenAccess,
  ListItemNameMaster
);
router.get("/itemNames-logs", ListItemNameLogs);

router.get(
  "/dropdown-item-name-master",
  // CheckRoleAndTokenAccess,
  DropdownItemNameMaster
);

export default router;
