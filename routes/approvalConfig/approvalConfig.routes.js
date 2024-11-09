import express from "express";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";
import { AddApprovalConfigMaster, ListApprovalConfigMaster, UpdateApprovalConfigMaster } from "../../controllers/approvalConfig/approvalConfig.controller.js";
// import { ListApprovalConfigLogs } from "../../controllers/logs/Masters/ApprovalConfigLogs.js";

const router = express.Router();

router.post("/add-approvalConfig-master", AddApprovalConfigMaster);
router.post("/update-approvalConfig-master", AuthMiddleware, RolesPermissions("approval_config", "edit"), UpdateApprovalConfigMaster);
router.get("/list-approvalConfig-master", AuthMiddleware, RolesPermissions("approval_config", "view"), ListApprovalConfigMaster);




export default router;
