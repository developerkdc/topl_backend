import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  AddGstMaster,
  DropdownGstMaster,
  ListGstMaster,
  UpdateGstMaster,
} from "../../controllers/masters/gst.js";
// import { ListGstLogs } from "../../controllers/logs/Masters/GstLogs.js";

const router = express.Router();

router.post("/add-gst-master", CheckRoleAndTokenAccess, AddGstMaster);
router.post("/update-gst-master", CheckRoleAndTokenAccess, UpdateGstMaster);
router.post("/list-gst-master", CheckRoleAndTokenAccess, ListGstMaster);
// router.get("/gst-logs", ListGstLogs);
router.get("/dropdown-gst-master", DropdownGstMaster);

export default router;
