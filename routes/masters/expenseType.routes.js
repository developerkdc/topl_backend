import express from "express";
import {
  AddExpenseTypeMaster,
  DropdownExpenseTypeMaster,
  ListExpenseTypeMaster,
  UpdateExpenseTypeMaster,
} from "../../controllers/masters/expenseType.js";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";
// import { ListExpenseTypeLogs } from "../../controllers/logs/Masters/ExpenseTypeLogs.js";

const router = express.Router();

router.post("/add-expenseType-master", AuthMiddleware, RolesPermissions("expense_type_master", "create"), AddExpenseTypeMaster);
router.post("/update-expenseType-master", AuthMiddleware, RolesPermissions("expense_type_master", "edit"), UpdateExpenseTypeMaster);
router.post("/list-expenseType-master", AuthMiddleware, RolesPermissions("expense_type_master", "view"), ListExpenseTypeMaster);
// router.get("/expenseType-logs", ListExpenseTypeLogs);

// without permission
router.get("/dropdown-expenseType-master", AuthMiddleware, DropdownExpenseTypeMaster);

export default router;
