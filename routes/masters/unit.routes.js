import express from "express";

import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  AddUnitMaster,
  DropdownUnitMaster,
  ListUnitMaster,
  UpdateUnitMaster,
} from "../../controllers/masters/unit.js";
import { ListUnitsLogs } from "../../controllers/logs/Masters/unitLogs.js";

const router = express.Router();

router.post("/add-unit-master", CheckRoleAndTokenAccess, AddUnitMaster);
router.post("/update-unit-master", CheckRoleAndTokenAccess, UpdateUnitMaster);
router.post("/list-unit-master", CheckRoleAndTokenAccess, ListUnitMaster);
router.get("/dropdown-unit-master", DropdownUnitMaster);
router.get("/units-logs", ListUnitsLogs);

export default router;
