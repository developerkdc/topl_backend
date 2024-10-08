import express from "express";
import { AddGstMaster, DropdownGstMaster, ListGstMaster, UpdateGstMaster } from "../../controllers/masters/gst.js";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import RolesPermissions from "../../middlewares/permission.js";
// import { ListGstLogs } from "../../controllers/logs/Masters/GstLogs.js";

const router = express.Router();

router.post("/add-gst-master", AuthMiddleware, RolesPermissions("gst_master", "create"), AddGstMaster);
router.post("/update-gst-master", AuthMiddleware, RolesPermissions("gst_master", "edit"), UpdateGstMaster);
router.post("/list-gst-master", AuthMiddleware, RolesPermissions("gst_master", "view"), ListGstMaster);
// router.get("/gst-logs", ListGstLogs);

// without permission
router.get("/dropdown-gst-master", AuthMiddleware, DropdownGstMaster);

export default router;
