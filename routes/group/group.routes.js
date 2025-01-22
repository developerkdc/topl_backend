import express from 'express';

import CheckRoleAndTokenAccess from '../../middlewares/permission.js';
import { FetchIssuedForGrouping } from '../../controllers/grouping/issuedForGrouping.js';
import {
  CancelSmokingGroup,
  CreateGroup,
  FetchCreatedGroups,
  FetchIssuedForSmokingGroup,
  GetLatestGroupNo,
  IssueForCuttingGroup,
  IssueForSmokingGroup,
  RevertCreatedGroup,
  UpdateGroupVeneer,
} from '../../controllers/grouping/createGroup.js';
import {
  DropdownGroupingNo,
  FetchCreatedGroupsHistory,
} from '../../controllers/grouping/groupHistory.js';
import { MulterFunction } from '../../config/multer/multer.js';
import {
  CancelDyingGroup,
  FetchIssuedForDyingGroup,
  IssueForDyingGroup,
} from '../../controllers/grouping/issuedActions.js';
import {
  BulkUploadForCreateGroup,
  BulkUploadForCreateGroupItemsDetails,
} from '../../controllers/grouping/bulkUpload.js';
import bulk from '../../config/bulkUpload/bulk.js';
import { ListIssuedForGroupingLogs } from '../../controllers/logs/Factory/Grouping/issuedForGroupingLogs.js';
import { ListGroupingDoneLogs } from '../../controllers/logs/Factory/Grouping/GroupingDoneLogs.js';
import { ListGroupingHistoryLogs } from '../../controllers/logs/Factory/Grouping/groupingHistory.js';
const router = express.Router();

//Issued For Grouping List Api
router.post(
  '/list-issued-for-grouping',
  CheckRoleAndTokenAccess,
  FetchIssuedForGrouping
);

//Create Group Api
router.post(
  '/create-group',
  CheckRoleAndTokenAccess,
  MulterFunction('./public/upload/images/group').fields([
    { name: 'group_images' },
  ]),
  CreateGroup
);

//Create Bulk upload Group Api
router.post(
  '/bulk-upload-group',
  bulk('/group_bulk_upload').single('excelFile'),
  BulkUploadForCreateGroup
);
router.post(
  '/bulk-upload-group-item-details',
  bulk('/group_bulk_upload').single('excelFile'),
  BulkUploadForCreateGroupItemsDetails
);

//List Created Group Api
router.post('/list-group', CheckRoleAndTokenAccess, FetchCreatedGroups);

//Revert Created Group
router.post('/revert-group', CheckRoleAndTokenAccess, RevertCreatedGroup);

//List Created Grouped veneer inventory Api
router.post(
  '/list-group-inventory',
  CheckRoleAndTokenAccess,
  FetchCreatedGroups
);

//List Group History
router.post(
  '/list-group-history',
  CheckRoleAndTokenAccess,
  FetchCreatedGroupsHistory
);

//List Grouped veneer inventory History
router.post(
  '/list-group-inventory-history',
  CheckRoleAndTokenAccess,
  FetchCreatedGroupsHistory
);

// Get group no
router.get('/get-group-no', CheckRoleAndTokenAccess, GetLatestGroupNo);

//List issued for smoking grouping
router.post(
  '/issue-for-smoking-group',
  CheckRoleAndTokenAccess,
  IssueForSmokingGroup
);

// List issued for smoking group
router.post(
  '/list-issued-for-smoking-group',
  CheckRoleAndTokenAccess,
  FetchIssuedForSmokingGroup
);

// Cancel smoking group
router.post(
  '/cancel-smoking-group',
  CheckRoleAndTokenAccess,
  CancelSmokingGroup
);

//Issue for cutting
router.post(
  '/issue-for-cutting',
  CheckRoleAndTokenAccess,
  IssueForCuttingGroup
);
router.patch(
  '/update-group-veneer',
  CheckRoleAndTokenAccess,
  UpdateGroupVeneer
);
//dropdown group No
router.get('/dropdown-group-no', DropdownGroupingNo);

// Dying group

//List issued for dying grouping
router.post(
  '/issue-for-dying-group',
  CheckRoleAndTokenAccess,
  IssueForDyingGroup
);

// List issued for dying group
router.post(
  '/list-issued-for-dying-group',
  CheckRoleAndTokenAccess,
  FetchIssuedForDyingGroup
);

// Cancel dying group
router.post('/cancel-dying-group', CheckRoleAndTokenAccess, CancelDyingGroup);

//logs
router.get('/issuedforgrouping-logs', ListIssuedForGroupingLogs);
router.get('/created-groups-logs', ListGroupingDoneLogs);
router.get('/groupsHistory-logs', ListGroupingHistoryLogs);

export default router;
