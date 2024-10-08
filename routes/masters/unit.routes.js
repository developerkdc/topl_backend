import express from "express";
import { AddUnitMaster, DropdownUnitMaster, ListUnitMaster, UpdateUnitMaster } from "../../controllers/masters/unit.js";
import { ListUnitsLogs } from "../../controllers/logs/Masters/unitLogs.js";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";

const router = express.Router();

router.post("/add-unit-master", AuthMiddleware, RolesPermissions("unit_master", "create"), AddUnitMaster);
router.post("/update-unit-master", AuthMiddleware, RolesPermissions("unit_master", "edit"), UpdateUnitMaster);
router.post("/list-unit-master", AuthMiddleware, RolesPermissions("unit_master", "view"), ListUnitMaster);
// router.get("/units-logs", AuthMiddleware, ListUnitsLogs);

// without permission
router.get("/dropdown-unit-master", AuthMiddleware, DropdownUnitMaster);

export default router;
