import express from "express";
import { AddCutMaster, DropdownCutMaster, ListCutMaster, UpdateCutMaster } from "../../controllers/masters/cut.js";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";
// import { ListCutLogs } from "../../controllers/logs/Masters/CutLogs.js";

const router = express.Router();

router.post("/add-cut-master", AuthMiddleware, RolesPermissions("cut_master", "create"), AddCutMaster);
router.post("/update-cut-master", AuthMiddleware, RolesPermissions("cut_master", "edit"), UpdateCutMaster);
router.post("/list-cut-master", AuthMiddleware, RolesPermissions("cut_master", "view"), ListCutMaster);
// router.get("/cut-logs", ListCutLogs);

// without permission
router.get("/dropdown-cut-master", AuthMiddleware, DropdownCutMaster);

export default router;
