import express from "express";
import { AddUser, DeleteUser, ListUser, UpdateUser, RoleNameList, AdminChangePassword } from "../controllers/users.js";
import { ListUserLogs } from "../controllers/logs/userLogs.js";
import AuthMiddleware from "../middlewares/verifyToken.js";
import RolesPermissions from "../middlewares/permission.js";

const router = express.Router();
router.post("/add-user", AuthMiddleware, RolesPermissions("user", "create"), AddUser);
router.post("/update-user", AuthMiddleware, RolesPermissions("user", "edit"), UpdateUser);
router.post("/list-user", AuthMiddleware, RolesPermissions("user", "view"), ListUser);
router.delete("/delete-user", AuthMiddleware, RolesPermissions("user", "edit"), DeleteUser);
router.patch("/admin-change-password", AuthMiddleware, RolesPermissions("user", "edit"), AdminChangePassword);

// router.get("/user-logs",AuthMiddleware, ListUserLogs);

// without permission
router.get("/role-name-list", AuthMiddleware, RoleNameList);

export default router;
