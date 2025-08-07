import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  download_excel_issued_for_bunito,
  fetch_single_issue_for_bunito_item,
  listing_issued_for_bunito,
} from '../../../../controllers/factory/bunito/issue_for_bunito/issue_for_bunito.controller.js';

const issue_for_bunito_router = Router();

issue_for_bunito_router.post(
  '/list',
  AuthMiddleware,
  listing_issued_for_bunito
);
issue_for_bunito_router.get(
  '/fetch-single-issue-for-bunito/:id',
  AuthMiddleware,
  fetch_single_issue_for_bunito_item
);

issue_for_bunito_router.post(
  '/download-factory-issue-for-bunito-excel',
  AuthMiddleware,
  download_excel_issued_for_bunito
);
export default issue_for_bunito_router;
