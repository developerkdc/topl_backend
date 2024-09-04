import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  CreateTapping,
  FetchIssuedForTapping,
  FetchTappingDone,
  RevertIssuedForTapping,
} from "../../controllers/taping/taping.js";
import { MulterFunction } from "../../config/multer/multer.js";

const router = express.Router();

router.post(
  "/issued-for-tapping-list",
  CheckRoleAndTokenAccess,
  FetchIssuedForTapping
);
router.post(
  "/revert-issued-for-tapping",
  CheckRoleAndTokenAccess,
  RevertIssuedForTapping
);

router.post(
  "/create-tapping",
  CheckRoleAndTokenAccess,
  MulterFunction("./public/upload/images/tapping").fields([
    { name: "tapping_images" },
  ]),
  CreateTapping
);

router.post("/tapping-done-list", CheckRoleAndTokenAccess, FetchTappingDone);
export default router;
