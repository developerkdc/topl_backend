import express from 'express';
import {
  AddGradeMaster,
  DropdownGradeMaster,
  ListGradeMaster,
  UpdateGradeMaster,
} from '../../controllers/masters/grade.js';
import { ListGradeLogs } from '../../controllers/logs/Masters/gradeLogs.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';

const router = express.Router();

router.post(
  '/add-grade-master',
  AuthMiddleware,
  RolesPermissions('grade_master', 'create'),
  AddGradeMaster
);
router.post(
  '/update-grade-master',
  AuthMiddleware,
  RolesPermissions('grade_master', 'edit'),
  UpdateGradeMaster
);
router.post(
  '/list-grade-master',
  AuthMiddleware,
  RolesPermissions('grade_master', 'view'),
  ListGradeMaster
);
// router.get("/grade-logs",AuthMiddleware, ListGradeLogs);

// without permission
router.get('/dropdown-grade-master', AuthMiddleware, DropdownGradeMaster);

export default router;
