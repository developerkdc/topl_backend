import { Router } from "express";
import { addMachine, MachineDetails, editMachineDetails, DropdownMachineNameMaster } from "../../controllers/masters/machine.controller.js";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";
const router = Router();

router.post("/add-machine", AuthMiddleware, RolesPermissions("machine_master", "create"), addMachine);
router.post("/update-machine", AuthMiddleware, RolesPermissions("machine_master", "edit"), editMachineDetails);
router.post("/list-machine", AuthMiddleware, RolesPermissions("machine_master", "view"), MachineDetails);

// without permission
router.get("/dropdown-machine-master", AuthMiddleware, DropdownMachineNameMaster);

export default router;
