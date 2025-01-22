import { Router } from 'express';
import {
  addItems,
  DropdownSubcategoryNameMaster,
  editItemSubCategory,
  listItemSubCategories,
} from '../../controllers/masters/itemSubcategory.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';

const router = Router();
router.post(
  '/add',
  AuthMiddleware,
  RolesPermissions('item_sub_category_master', 'create'),
  addItems
);
router.post(
  '/update/:id',
  AuthMiddleware,
  RolesPermissions('item_sub_category_master', 'edit'),
  editItemSubCategory
);
router.post(
  '/list',
  AuthMiddleware,
  RolesPermissions('item_sub_category_master', 'view'),
  listItemSubCategories
);

// without permission
router.get(
  '/dropdown-subcategory-master',
  AuthMiddleware,
  DropdownSubcategoryNameMaster
);

export default router;
