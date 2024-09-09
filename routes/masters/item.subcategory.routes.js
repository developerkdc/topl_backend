import { Router } from "express";
import { addItems, editItemSubCategory, listItemSubCategories } from "../../controllers/masters/itemSubcategory.js";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";

const router = Router();
router.post('/add', CheckRoleAndTokenAccess, addItems);
router.post("/update/:id", CheckRoleAndTokenAccess, editItemSubCategory);
router.get("/list", CheckRoleAndTokenAccess, listItemSubCategories);

export default router;