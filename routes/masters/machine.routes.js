import { Router } from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { addMachine, MachineDetails, editMachineDetails } from '../../controllers/masters/machine.controller.js'
const router = Router();

router.post('/add-machine', CheckRoleAndTokenAccess, addMachine);
router.post("/update-machine/:id", CheckRoleAndTokenAccess, editMachineDetails);
router.get("/list-machine", CheckRoleAndTokenAccess, MachineDetails)

export default router;