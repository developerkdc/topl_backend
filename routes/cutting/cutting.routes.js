import express from 'express';
import CheckRoleAndTokenAccess from '../../middlewares/permission.js';
import {
  FetchIssuedForCutting,
  RevertIssuedForCutting,
} from '../../controllers/cutting/issuedForCutting.js';
import {
  CreateCutting,
  FetchCuttingDone,
} from '../../controllers/cutting/createCutting.js';
import { MulterFunction } from '../../config/multer/multer.js';

const router = express.Router();

//Raw Veneer
router.post(
  '/list-issued-for-cutting',
  CheckRoleAndTokenAccess,
  FetchIssuedForCutting
);
router.post(
  '/revert-issued-for-cutting',
  CheckRoleAndTokenAccess,
  RevertIssuedForCutting
);

router.post(
  '/create-cutting',
  CheckRoleAndTokenAccess,
  MulterFunction('./public/upload/images/cutting').fields([
    { name: 'cutting_images' },
  ]),
  CreateCutting
);
router.post('/cutting-done-list', CheckRoleAndTokenAccess, FetchCuttingDone);

export default router;
