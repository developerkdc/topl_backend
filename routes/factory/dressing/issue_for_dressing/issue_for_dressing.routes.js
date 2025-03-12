import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  list_issue_for_dressing,
  fetch_single_issue_of_dressing_item,
  bulk_upload_machine_raw_data,
  bulk_upload_machine_raw_data_new,
  fetch_all_issue_for_dressing_items_by_item_other_details_id,
  list_issue_for_dressing_machine_miss_match_data,
  list_issue_for_dressing_raw_machine_data,
} from '../../../../controllers/factory/dressing/issue_for_dressing/issue_for_dressing.controller.js';
import multerFunction from '../../../../config/bulkUpload/bulk.js';

const issue_for_dressing_router = Router();

issue_for_dressing_router.post(
  '/list-issue-for-dressing',
  AuthMiddleware,
  list_issue_for_dressing
);
issue_for_dressing_router.get(
  '/list-issue-for-dressing-items-by-other-details-id/:id',
  AuthMiddleware,
  fetch_all_issue_for_dressing_items_by_item_other_details_id
);
issue_for_dressing_router.post(
  '/list-dressing-machine-raw-data',
  AuthMiddleware,
  list_issue_for_dressing_raw_machine_data
);
issue_for_dressing_router.post(
  '/list-dressing-machine-miss-match-data',
  AuthMiddleware,
  list_issue_for_dressing_machine_miss_match_data
);
issue_for_dressing_router.get(
  '/fetch-single-issue-for-dressing/:id',
  AuthMiddleware,
  fetch_single_issue_of_dressing_item
);

//bulk upload dressing report
issue_for_dressing_router?.post(
  '/bulk-upload-dressing-report',
  AuthMiddleware,
  multerFunction('raw_machine_dressing_report').single('file'),
  bulk_upload_machine_raw_data_new
);

export default issue_for_dressing_router;
