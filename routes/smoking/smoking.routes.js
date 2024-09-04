import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { CreateIndividualSmoked } from "../../controllers/smoking/createIndividualSmoked.js";
import { MulterFunction } from "../../config/multer/multer.js";
import {
  FetchCreatedIndividualSmoked,
  PassIndividualSmoked,
  RejectIndividualSmoked,
} from "../../controllers/smoking/smokedIndividualHistory.js";
import { CreateGroupSmoked } from "../../controllers/smoking/createGroupSmoked.js";
import {
  FetchCreatedGroupSmoked,
  PassGroupSmoked,
  RejectGroupSmoked,
} from "../../controllers/smoking/smokedGroupHistory.js";
import { ListIssuedForSmokingGrpLogs } from "../../controllers/logs/Factory/Smoking/issuedForSmokingGroupLogs.js";
import { ListSmokedIndividualsLogs } from "../../controllers/logs/Factory/Smoking/individualSmoked.js";
import { ListSmokedGroupsLogs } from "../../controllers/logs/Factory/Smoking/groupSmoked.js";

const router = express.Router();

// individual
router.post(
  "/create-individual-smoked",
  CheckRoleAndTokenAccess,
  MulterFunction("./public/upload/images/smoke").fields([
    { name: "smoke_images" },
  ]),
  CreateIndividualSmoked
);

router.post(
  "/list-individual-smoked",
  CheckRoleAndTokenAccess,
  FetchCreatedIndividualSmoked
);

router.post(
  "/reject-individual-smoked",
  CheckRoleAndTokenAccess,
  RejectIndividualSmoked
);

router.post(
  "/pass-individual-smoked",
  CheckRoleAndTokenAccess,
  PassIndividualSmoked
);

// group

router.post(
  "/create-group-smoked",
  CheckRoleAndTokenAccess,
  MulterFunction("./public/upload/images/smoke").fields([
    { name: "smoke_images" },
  ]),
  CreateGroupSmoked
);

router.post(
  "/list-group-smoked",
  CheckRoleAndTokenAccess,
  FetchCreatedGroupSmoked
);

router.post("/reject-group-smoked", CheckRoleAndTokenAccess, RejectGroupSmoked);

router.post("/pass-group-smoked", CheckRoleAndTokenAccess, PassGroupSmoked);

//logs
router.get("/issuedForSmokingGroups-logs", ListIssuedForSmokingGrpLogs);
router.get("/individualSmoked-logs", ListSmokedIndividualsLogs);
router.get("/groupSmoked-logs", ListSmokedGroupsLogs);

export default router;
