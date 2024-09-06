import express from "express";

import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  addBranchToSupplier,
  addContactPersonToBranch,
  AddSupplierMaster,
  fetchAllBranchesBySupplierId,
  fetchAllSupplierWithBranchesDetails,
  fetchContactPersonById,
  ListSupplierMaster,
  ListSupplierMasterWithOutPermission,
  updateContactPersonInfo,
  updateSupplierBranchById,
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
router.post("/add-branch/:id", addBranchToSupplier);
router.get("/list-supplier-master", fetchAllSupplierWithBranchesDetails);
router.post("/update-supplier-branch", updateSupplierBranchById);
router.post("/update-contact-person", updateContactPersonInfo);
router.get("/branchs-by-supplier/:id", fetchAllBranchesBySupplierId);
router.get("/contact-person/:id", fetchContactPersonById);
router.post("/add-contact-person/:id", addContactPersonToBranch);
router.get("/")
// router.get("/list-supplier-master",CheckRoleAndTokenAccess, ListSupplierMasterLogs);

export default router;
