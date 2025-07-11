import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_issue_for_polishing_from_pressing,
  download_excel_issued_for_polishing,
  fetch_single_issue_for_polishing_item,
  listing_issued_for_polishing,
  revert_issue_for_polishing,
} from '../../../../controllers/factory/polishing/issue_for_polishing/issue_for_polishing.controller.js';

const issue_for_polishing_router = Router();

issue_for_polishing_router.post(
  '/issue',
  AuthMiddleware,
  add_issue_for_polishing_from_pressing
);
issue_for_polishing_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_issue_for_polishing
);
issue_for_polishing_router.post(
  '/list',
  AuthMiddleware,
  listing_issued_for_polishing
);

issue_for_polishing_router.get(
  '/fetch-single-issue-for-polishing/:id',
  AuthMiddleware,
  fetch_single_issue_for_polishing_item
);
// issue_for_polishing_router.post("/list-damage", AuthMiddleware, listing_polishing_damage);

issue_for_polishing_router.post(
  '/download-factory-issue-for-polishing-excel',
  AuthMiddleware,
  download_excel_issued_for_polishing
);

export default issue_for_polishing_router;
