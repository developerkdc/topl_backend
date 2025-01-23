import express from 'express';
import CheckRoleAndTokenAccess from '../../middlewares/permission.js';
import {
  AddPartyNameMaster,
  ListPartyNameMaster,
  ListPartyNameMasterWithOutPermission,
  UpdatePartyNameMaster,
} from '../../controllers/masters/partyName.js';

const router = express.Router();

router.post(
  '/add-party-name-master',
  CheckRoleAndTokenAccess,
  AddPartyNameMaster
);
router.post(
  '/update-party-name-master',
  CheckRoleAndTokenAccess,
  UpdatePartyNameMaster
);
router.post(
  '/list-party-name-master',
  CheckRoleAndTokenAccess,
  ListPartyNameMaster
);
router.get(
  '/list-party-name-without-permission',
  ListPartyNameMasterWithOutPermission
);

export default router;
