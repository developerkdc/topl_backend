import express from "express";
import { AddRole, DropdownRoleMaster, ListRoles, UpdateRole } from "../controllers/roles.js";
import { ListRolesLogs } from "../controllers/logs/rolesLogs.js";
import AuthMiddleware from "../middlewares/verifyToken.js";
import RolesPermissions from "../middlewares/permission.js";

const router = express.Router();
router.post("/add-role", AuthMiddleware, RolesPermissions("role", "create"), AddRole);
router.post("/update-role", AuthMiddleware, RolesPermissions("role", "edit"), UpdateRole);
router.post("/list-role", AuthMiddleware, RolesPermissions("role", "view"), ListRoles);
// router.get("/roles-logs", AuthMiddleware, ListRolesLogs);

// without permission
router.get("/dropdown-roles-master", AuthMiddleware, DropdownRoleMaster);

export default router;
