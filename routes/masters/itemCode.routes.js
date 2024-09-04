import express from "express";

import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  ListItemCodeMaster,
  UpdateItemCodeMaster,
  AddItemCodeMaster,
  DropdownItemCodeMaster,
} from "../../controllers/masters/itemCode.js";
import { ListItemCodeLogs } from "../../controllers/logs/Masters/itemTypeLogs.js";

const router = express.Router();

router.post(
  "/add-item-code-master",
  CheckRoleAndTokenAccess,
  AddItemCodeMaster
);
router.post(
  "/update-item-code-master",
  CheckRoleAndTokenAccess,
  UpdateItemCodeMaster
);
router.post(
  "/list-item-code-master",
  CheckRoleAndTokenAccess,
  ListItemCodeMaster
);
router.get("/itemCode-logs", ListItemCodeLogs);

router.get("/dropdown-item-code-master", DropdownItemCodeMaster);
export default router;
