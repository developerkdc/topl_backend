import express from "express";

import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  AddSupplierMaster,
  ListSupplierMaster,
  ListSupplierMasterWithOutPermission,
  UpdateSupplierMaster,
} from "../../controllers/masters/supplier.js";
import { ListSuppliersLogs } from "../../controllers/logs/Masters/suppliersLogs.js";

const router = express.Router();

router.post("/add-supplier-master", CheckRoleAndTokenAccess, AddSupplierMaster);
router.post(
  "/update-supplier-master",
  CheckRoleAndTokenAccess,
  UpdateSupplierMaster
);
router.post(
  "/list-supplier-master",
  CheckRoleAndTokenAccess,
  ListSupplierMaster
);
router.get(
  "/list-supplier-master-without-permission",
  ListSupplierMasterWithOutPermission
);
router.get("/supplier-logs", ListSuppliersLogs);

// router.get("/list-supplier-master",CheckRoleAndTokenAccess, ListSupplierMasterLogs);

export default router;
