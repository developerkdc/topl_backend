import express from 'express';
import bulk from '../../../config/bulkUpload/bulk.js';
import {
  CancelDyingRaw,
  IssueForDyingRaw,
  IssueForDyingRawPattas,
  IssuedForDyingRawList,
} from '../../../controllers/inventory/raw/issueAction.js';
import {
  AddRawVeneer,
  BulkUploadRawMaterial,
  CancelGrouping,
  CancelSmokingRaw,
  DeleteRawVeneer,
  FetchRawVeneer,
  FetchRawVeneerHistory,
  IssueForGrouping,
  IssueForSmokingRaw,
  IssueForSmokingRawPattas,
  IssuedForSmokingRawList,
  RawItemBundleNoExist,
  RawTotalSqmList,
  UpdateRawVeneer,
  UpdateRawVeneerData,
  rejectRawVeneer,
  rejectRawVeneerMultiple,
} from '../../../controllers/inventory/raw/raw.js';
import { ListIssuedForDyingLogs } from '../../../controllers/logs/Factory/Dying/issuedForDyingLogs.js';
import { ListIssuedForGroupingLogs } from '../../../controllers/logs/Factory/Grouping/issuedForGroupingLogs.js';
import { ListIssuedForSmokingLogs } from '../../../controllers/logs/Factory/Smoking/issuedForSmokingLogs.js';
import { ListRawMaterialHistoryLogs } from '../../../controllers/logs/Inventory/RawMaterial/rawMaterialsHistoryLogs.js';
import { ListRawMaterialLogs } from '../../../controllers/logs/Inventory/RawMaterial/rawMaterialsLogs.js';
import CheckRoleAndTokenAccess from '../../../middlewares/permission.js';

const router = express.Router();

//Raw Veneer
router.post(
  '/bulk-upload-raw-material',
  CheckRoleAndTokenAccess,
  bulk('/raw-material_bulk_upload').single('excelFile'),
  BulkUploadRawMaterial
);

router.post('/add-raw-veneer', CheckRoleAndTokenAccess, AddRawVeneer);
router.patch('/update-raw-veneer', CheckRoleAndTokenAccess, UpdateRawVeneer);
router.post(
  '/update-raw-veneer-data',
  CheckRoleAndTokenAccess,
  UpdateRawVeneerData
);
router.delete('/delete-raw-veneer', CheckRoleAndTokenAccess, DeleteRawVeneer);
router.patch('/reject-raw-veneer', CheckRoleAndTokenAccess, rejectRawVeneer);
router.patch(
  '/reject-raw-veneer-multiple',
  CheckRoleAndTokenAccess,
  rejectRawVeneerMultiple
);
router.post('/fetch-raw-veneer', CheckRoleAndTokenAccess, FetchRawVeneer);
router.post(
  '/fetch-raw-veneer-history',
  CheckRoleAndTokenAccess,
  FetchRawVeneerHistory
);
router.get('/rawmaterial-logs', ListRawMaterialLogs);
router.get('/rawmaterialhistory-logs', ListRawMaterialHistoryLogs);

//Grouping
router.post('/issue-for-grouping', CheckRoleAndTokenAccess, IssueForGrouping);
router.post('/cancel-grouping', CheckRoleAndTokenAccess, CancelGrouping);
router.get('/issuedForGrouping-logs', ListIssuedForGroupingLogs);

//Smoking
router.post('/issue-for-smoking', CheckRoleAndTokenAccess, IssueForSmokingRaw);
router.post(
  '/issued-for-smoking-raw-list',
  CheckRoleAndTokenAccess,
  IssuedForSmokingRawList
);
router.post('/cancel-smoking-raw', CheckRoleAndTokenAccess, CancelSmokingRaw);
router.post(
  '/issue-for-smoking-pattas',
  CheckRoleAndTokenAccess,
  IssueForSmokingRawPattas
);
router.get('/issuedForSmoking-logs', ListIssuedForSmokingLogs);

//Dying
router.post('/issue-for-dying', CheckRoleAndTokenAccess, IssueForDyingRaw);
router.post(
  '/issued-for-dying-raw-list',
  CheckRoleAndTokenAccess,
  IssuedForDyingRawList
);
router.post('/cancel-dying-raw', CheckRoleAndTokenAccess, CancelDyingRaw);
router.post(
  '/issue-for-dying-pattas',
  CheckRoleAndTokenAccess,
  IssueForDyingRawPattas
);
router.get('/available-sqm', CheckRoleAndTokenAccess, RawTotalSqmList);
router.get('/issuedForDying-logs', ListIssuedForDyingLogs);
router.post('/raw-item_bundle_no-exist', RawItemBundleNoExist);

export default router;
