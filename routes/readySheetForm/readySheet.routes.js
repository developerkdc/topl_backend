import express from 'express';
import CheckRoleAndTokenAccess from '../../middlewares/permission.js';
import {
  ApproveReadySheetForm,
  FetchReadySheetForm,
  FetchReadySheetFormHistory,
  RejectReadySheetForm,
  RevertReadySheetForm,
  SplitReadySheetForm,
  UpdateReadySheetForm,
} from '../../controllers/readySheetForm/readySheet.js';

const router = express.Router();

router.post('/list', CheckRoleAndTokenAccess, FetchReadySheetForm);
router.post('/revert', CheckRoleAndTokenAccess, RevertReadySheetForm);
router.post('/split', CheckRoleAndTokenAccess, SplitReadySheetForm);
router.post('/reject', CheckRoleAndTokenAccess, RejectReadySheetForm);
router.post('/approve', CheckRoleAndTokenAccess, ApproveReadySheetForm);
router.patch(
  '/update-ready-sheet-form',
  CheckRoleAndTokenAccess,
  UpdateReadySheetForm
);

router.post(
  '/history-list',
  CheckRoleAndTokenAccess,
  FetchReadySheetFormHistory
);
export default router;
