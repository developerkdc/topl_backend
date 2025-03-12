import express from 'express';
import {
  ChangeAuthUserPassword,
  GetAuthUser,
  UpdateAuthUserProfile,
} from '../controllers/profile.js';
import AuthMiddleware from '../middlewares/verifyToken.js';
import RolesPermissions from '../middlewares/permission.js';

const router = express.Router();

router.post(
  '/update-user-profile',
  AuthMiddleware,
  RolesPermissions('user', 'edit'),
  UpdateAuthUserProfile
);
router.patch(
  '/change-password',
  AuthMiddleware,
  RolesPermissions('user', 'edit'),
  ChangeAuthUserPassword
);
router.get('/list-user-profile', AuthMiddleware, GetAuthUser);

export default router;
