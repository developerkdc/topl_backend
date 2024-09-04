import express from "express";
import {
  AddUser,
  DeleteUser,
  ListUser,
  UpdateUser,
  RoleNameList,
  EmployeeIdAutoGenerate,
  AdminChangePassword,
} from "../controllers/users.js";
import CheckRoleAndTokenAccess from "../middlewares/permission.js";
import { ListUserLogs } from "../controllers/logs/userLogs.js";

const router = express.Router();
router.post("/add-user", CheckRoleAndTokenAccess, AddUser);
router.post("/update-user", CheckRoleAndTokenAccess, UpdateUser);
router.post("/list-user", CheckRoleAndTokenAccess, ListUser);
router.delete("/delete-user", CheckRoleAndTokenAccess, DeleteUser);
router.get("/user-logs", ListUserLogs);
router.patch(
  "/admin-change-password",
  CheckRoleAndTokenAccess,
  AdminChangePassword
);
router.get("/role-name-list", RoleNameList);
router.get("/employee-id-auto-generate", EmployeeIdAutoGenerate);

export default router;
