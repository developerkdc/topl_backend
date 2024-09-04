import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { MulterFunction } from "../../config/multer/multer.js";
import {
  FetchIssuedForFinishing,
  ListFinishingDone,
  RevertIssuedForFinishing,
  UpdateFinishingStatus,
  createFinishing,
} from "../../controllers/finishing/finishing.js";

const router = express.Router();

router.post(
  "/issued-for-finishing-list",
  CheckRoleAndTokenAccess,
  FetchIssuedForFinishing
);
router.post(
  "/revert-issued-for-finishing",
  CheckRoleAndTokenAccess,
  RevertIssuedForFinishing
);

router.patch(
  "/update-finishing-status",
  CheckRoleAndTokenAccess,
  UpdateFinishingStatus
);

router.post(
  "/create-finishing",
  CheckRoleAndTokenAccess,
  MulterFunction("./public/upload/images/finishing").fields([
    { name: "finishing_images" },
  ]),
  createFinishing
);

router.post("/finishing-done-list", CheckRoleAndTokenAccess, ListFinishingDone);

export default router;
