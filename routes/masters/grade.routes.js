import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { AddGradeMaster, DropdownGradeMaster, ListGradeMaster, UpdateGradeMaster } from "../../controllers/masters/grade.js";
import { ListGradeLogs } from "../../controllers/logs/Masters/gradeLogs.js";

const router = express.Router();

router.post("/add-grade-master", CheckRoleAndTokenAccess, AddGradeMaster);
router.post("/update-grade-master", CheckRoleAndTokenAccess, UpdateGradeMaster);
router.post("/list-grade-master", CheckRoleAndTokenAccess, ListGradeMaster);
router.get("/grade-logs", ListGradeLogs);
router.get("/dropdown-grade-master", DropdownGradeMaster);

export default router;
