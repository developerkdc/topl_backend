import express from "express";
import bulk from "../../config/bulkUpload/bulk.js";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  AddPalleteMaster,
  BulkUploadPalleteMaster,
  DropdownPalleteMaster,
  ListPalleteMaster,
  UpdatePalleteMaster,
} from "../../controllers/masters/pallete.js";
import { ListPalletLogs } from "../../controllers/logs/Masters/palletLogs.js";

const router = express.Router();

router.post("/add-pallete-master", CheckRoleAndTokenAccess, AddPalleteMaster);
router.post(
  "/update-pallete-master",
  CheckRoleAndTokenAccess,
  UpdatePalleteMaster
);
router.post("/list-pallete-master", CheckRoleAndTokenAccess, ListPalleteMaster);
router.get("/dropdown-pallete-master", DropdownPalleteMaster);
router.get("/pallete-logs", ListPalletLogs);

router.post(
  "/bulk-upload-pallete-master",
  CheckRoleAndTokenAccess,
  bulk("/pallete_master_bulk_upload").single("excelFile"),
  BulkUploadPalleteMaster
);

export default router;
