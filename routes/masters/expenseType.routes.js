import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { AddExpenseTypeMaster, DropdownExpenseTypeMaster, ListExpenseTypeMaster, UpdateExpenseTypeMaster } from "../../controllers/masters/expenseType.js";
// import { ListExpenseTypeLogs } from "../../controllers/logs/Masters/ExpenseTypeLogs.js";

const router = express.Router();

router.post("/add-expenseType-master", CheckRoleAndTokenAccess, AddExpenseTypeMaster);
router.post("/update-expenseType-master", CheckRoleAndTokenAccess, UpdateExpenseTypeMaster);
router.post("/list-expenseType-master", CheckRoleAndTokenAccess, ListExpenseTypeMaster);
// router.get("/expenseType-logs", ListExpenseTypeLogs);
router.get("/dropdown-expenseType-master", DropdownExpenseTypeMaster);

export default router;
