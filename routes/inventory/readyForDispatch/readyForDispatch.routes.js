import express from 'express';
import CheckRoleAndTokenAccess from '../../../middlewares/permission.js';

import {
  ListReadyForDispatch,
  RevertReadyForDispatch,
  UpdateReadyForDispatch,
} from '../../../controllers/readyForDispatch/readyForDispatch.js';

const router = express.Router();
router.post('/list', CheckRoleAndTokenAccess, ListReadyForDispatch);
router.post('/revert', CheckRoleAndTokenAccess, RevertReadyForDispatch);
router.patch('/update', CheckRoleAndTokenAccess, UpdateReadyForDispatch);

export default router;
