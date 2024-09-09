import { Router } from "express";
import { addItems, editItemCatgory, fetchAllCategories, listItemCategories, } from "../../controllers/masters/itemCategory.controller.js";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";

const router = Router();

router.post('/add', CheckRoleAndTokenAccess, addItems);
router.post("/update/:id", CheckRoleAndTokenAccess, editItemCatgory);
router.get("/list", CheckRoleAndTokenAccess, listItemCategories);
router.get("/all-categories", fetchAllCategories)

export default router;