import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";

import { MulterFunction } from "../../config/multer/multer.js";
import {
  FetchIssuedForPressing,
  FetchPressingDone,
  RevertIssuedForPressing,
  createPressing,
} from "../../controllers/pressing/pressing.js";

const router = express.Router();

router.post(
  "/issued-for-pressing-list",
  CheckRoleAndTokenAccess,
  FetchIssuedForPressing
);

router.post(
  "/revert-issued-for-pressing",
  CheckRoleAndTokenAccess,
  RevertIssuedForPressing
);

router.post("/create-pressing", CheckRoleAndTokenAccess, createPressing);

router.post("/pressing-done-list", CheckRoleAndTokenAccess, FetchPressingDone);
export default router;
