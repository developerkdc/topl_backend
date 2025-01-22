import express from 'express';
import {
  addBranchToSupplier,
  addContactPersonToBranch,
  AddSupplierMaster,
  DropdownSupplierBranches,
  DropdownSupplierName,
  fetchAllBranchesBySupplierId,
  fetchAllSuppliers,
  fetchAllSupplierWithBranchesDetails,
  fetchContactPersonById,
  fetchSupplierMainBranchBySupplierId,
  ListSupplierMaster,
  ListSupplierMasterWithOutPermission,
  updateContactPersonInfo,
  updateSupplierBranchById,
  UpdateSupplierMaster,
  AddSupplierMasterNew,
  updateSupplierAndBranch,
} from '../../controllers/masters/supplier.js';
import { ListSuppliersLogs } from '../../controllers/logs/Masters/suppliersLogs.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';

const router = express.Router();

router.post(
  '/add-supplier-master',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'create'),
  AddSupplierMaster
); //old without session
router.post(
  '/add-supplier-master-new',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'create'),
  AddSupplierMasterNew
); //new  with session
router.post(
  '/update-supplier-master',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'edit'),
  UpdateSupplierMaster
);
router.post(
  '/list-supplier-master',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'view'),
  ListSupplierMaster
);
router.get(
  '/list-supplier-master-without-permission',
  AuthMiddleware,
  ListSupplierMasterWithOutPermission
);
router.get('/supplier-logs', AuthMiddleware, ListSuppliersLogs);
router.post(
  '/add-branch/:id',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'create'),
  addBranchToSupplier
);
router.get(
  '/list-supplier-master',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'view'),
  fetchAllSupplierWithBranchesDetails
);
router.post(
  '/update-supplier-branch',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'edit'),
  updateSupplierBranchById
);
router.post(
  '/update-contact-person',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'edit'),
  updateContactPersonInfo
);

router.get(
  '/branchs-by-supplier/:id',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'create'),
  fetchAllBranchesBySupplierId
);
router.get(
  '/contact-person/:id',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'view'),
  fetchContactPersonById
);
router.post(
  '/add-contact-person/:id',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'edit'),
  addContactPersonToBranch
);
router.get(
  '/fetch-supplier-main-branch/:id',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'view'),
  fetchSupplierMainBranchBySupplierId
);
router.post(
  '/update-supplier-and-branch-new',
  AuthMiddleware,
  RolesPermissions('supplier_master', 'edit'),
  updateSupplierAndBranch
); //new update branch and supplier
// without permission
router.get('/all-suppliers', AuthMiddleware, fetchAllSuppliers);
router.get('/dropdown-supplier-master', AuthMiddleware, DropdownSupplierName);
router.get(
  '/branches-by-supplier/:id',
  AuthMiddleware,
  DropdownSupplierBranches
);

// router.get("/list-supplier-master",AuthMiddleware, RolesPermissions("role", "create"), ListSupplierMasterLogs);

export default router;
