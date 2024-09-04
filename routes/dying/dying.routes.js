import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { MulterFunction } from "../../config/multer/multer.js";
import { CreateIndividualDyed } from "../../controllers/dying/createIndividualDyed.js";
import { FetchCreatedIndividualDyed, PassIndividualDyed, RejectIndividualDyed } from "../../controllers/dying/dyedIndividualHistory.js";
import { CreateGroupDyed } from "../../controllers/dying/createGroupDyed.js";
import { FetchCreatedGroupDyed, PassGroupDyed, RejectGroupDyed } from "../../controllers/dying/dyedGroupHistory.js";
import { ListIssuedForDyingGrpLogs } from "../../controllers/logs/Factory/Dying/issuedForDyingGroupsLogs.js";

const router = express.Router();

// individual
router.post(
  "/create-individual-dyed",
  CheckRoleAndTokenAccess,
  MulterFunction("./public/upload/images/dying").fields([{ name: "dying_images" }]),
  CreateIndividualDyed
);

router.post(
  "/list-individual-dyed",
  CheckRoleAndTokenAccess,
  FetchCreatedIndividualDyed
);

router.post(
  "/reject-individual-dyed",
  CheckRoleAndTokenAccess,
  RejectIndividualDyed
);

router.post(
  "/pass-individual-dyed",
  CheckRoleAndTokenAccess,
  PassIndividualDyed
);



// // group

router.post(
  "/create-group-dyed",
  CheckRoleAndTokenAccess,
  MulterFunction("./public/upload/images/dying").fields([{ name: "dying_images" }]),
  CreateGroupDyed
);


router.post(
  "/list-group-dyed",
  CheckRoleAndTokenAccess,
  FetchCreatedGroupDyed
);


router.post(
  "/reject-group-dyed",
  CheckRoleAndTokenAccess,
  RejectGroupDyed
);

router.post(
  "/pass-group-dyed",
  CheckRoleAndTokenAccess,
  PassGroupDyed
);

//logs
router.get("/issuedForDyingGroups-logs", ListIssuedForDyingGrpLogs);

export default router;
