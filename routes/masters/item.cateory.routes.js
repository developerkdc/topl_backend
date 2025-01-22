import { Router } from 'express';
import {
  addItems,
  DropdownItemCategoryNameMaster,
  editItemCatgory,
  fetchAllCategories,
  listItemCategories,
} from '../../controllers/masters/itemCategory.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';

const router = Router();

router.post(
  '/add',
  AuthMiddleware,
  AuthMiddleware,
  RolesPermissions('item_category_master', 'create'),
  addItems
);
router.post(
  '/update/:id',
  AuthMiddleware,
  AuthMiddleware,
  RolesPermissions('item_category_master', 'edit'),
  editItemCatgory
);
router.get(
  '/list',
  AuthMiddleware,
  AuthMiddleware,
  RolesPermissions('item_category_master', 'view'),
  listItemCategories
);

// without permission
router.get('/all-categories', AuthMiddleware, fetchAllCategories);
router.get(
  '/dropdown-category-master',
  AuthMiddleware,
  DropdownItemCategoryNameMaster
);

export default router;
