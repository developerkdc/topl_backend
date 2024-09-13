import { Router } from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  addDepartment,
  DropdownDepartmentMaster,
  editDepartment,
  fetchAllDepartments,
  listDepartmentDetails,
} from "../../controllers/masters/department.controller.js";

const router = Router();

router.post("/add-department", CheckRoleAndTokenAccess, addDepartment);
router.post("/update-department/:id", CheckRoleAndTokenAccess, editDepartment);
router.get("/list-department", CheckRoleAndTokenAccess, listDepartmentDetails);
router.get("/all-depts", fetchAllDepartments);
router.get("/dropdown-department-master", DropdownDepartmentMaster);
export default router;
