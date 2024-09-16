import { Router } from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  addMachine,
  MachineDetails,
  editMachineDetails,
  DropdownMachineNameMaster,
} from "../../controllers/masters/machine.controller.js";
const router = Router();

router.post("/add-machine", CheckRoleAndTokenAccess, addMachine);
router.post("/update-machine", CheckRoleAndTokenAccess, editMachineDetails);
router.post("/list-machine", CheckRoleAndTokenAccess, MachineDetails);
router.get("/dropdown-machine-master", DropdownMachineNameMaster);

export default router;
