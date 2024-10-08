import { Router } from "express";
import {
  addDepartment,
  DropdownDepartmentMaster,
  editDepartment,
  fetchAllDepartments,
  listDepartmentDetails,
} from "../../controllers/masters/department.controller.js";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";

const router = Router();

router.post("/add-department", AuthMiddleware, RolesPermissions("department_master", "create"), addDepartment);
router.post("/update-department/:id", AuthMiddleware, RolesPermissions("department_master", "edit"), editDepartment);
router.post("/list-department", AuthMiddleware, RolesPermissions("department_master", "view"), listDepartmentDetails);

// without permission
router.get("/all-depts", AuthMiddleware, fetchAllDepartments);
router.get("/dropdown-department-master", AuthMiddleware, DropdownDepartmentMaster);

export default router;
