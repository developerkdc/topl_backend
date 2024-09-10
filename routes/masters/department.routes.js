import { Router } from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { addDepartment, editDepartment, listDepartmentDetails } from "../../controllers/masters/department.controller.js";

const router = Router();

router.post('/add-department', CheckRoleAndTokenAccess, addDepartment);
router.post("/update-department/:id", CheckRoleAndTokenAccess, editDepartment);
router.get("/list-department", CheckRoleAndTokenAccess, listDepartmentDetails)
export default router