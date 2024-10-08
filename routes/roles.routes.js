import express from "express";
import {
  AddRole,
  DropdownRoleMaster,
  ListRoles,
  UpdateRole,
} from "../controllers/roles.js";
import CheckRoleAndTokenAccess from "../middlewares/permission.js";
import { ListRolesLogs } from "../controllers/logs/rolesLogs.js";

const router = express.Router();
router.post("/add-role",
  //  CheckRoleAndTokenAccess,
    AddRole);
router.post("/update-role", CheckRoleAndTokenAccess, UpdateRole);
router.post("/list-role", CheckRoleAndTokenAccess, ListRoles);
router.get("/dropdown-roles-master", DropdownRoleMaster);
router.get("/roles-logs", ListRolesLogs);


export default router;
