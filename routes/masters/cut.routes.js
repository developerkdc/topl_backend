import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { AddCutMaster, DropdownCutMaster, ListCutMaster, UpdateCutMaster } from "../../controllers/masters/cut.js";
// import { ListCutLogs } from "../../controllers/logs/Masters/CutLogs.js";

const router = express.Router();

router.post("/add-cut-master", CheckRoleAndTokenAccess, AddCutMaster);
router.post("/update-cut-master", CheckRoleAndTokenAccess, UpdateCutMaster);
router.post("/list-cut-master", CheckRoleAndTokenAccess, ListCutMaster);
// router.get("/cut-logs", ListCutLogs);
router.get("/dropdown-cut-master", DropdownCutMaster);

export default router;
