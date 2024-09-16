import { Router } from "express";
import {
  addItems,
  DropdownSubcategoryNameMaster,
  editItemSubCategory,
  listItemSubCategories,
} from "../../controllers/masters/itemSubcategory.js";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";

const router = Router();
router.post("/add", CheckRoleAndTokenAccess, addItems);
router.post("/update/:id", CheckRoleAndTokenAccess, editItemSubCategory);
router.post("/list", CheckRoleAndTokenAccess, listItemSubCategories);
router.get("/dropdown-subcategory-master", DropdownSubcategoryNameMaster);

export default router;
