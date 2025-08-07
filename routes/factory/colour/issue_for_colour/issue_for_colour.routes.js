import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_issue_for_color_from_pressing,
  download_excel_issued_for_color,
  fetch_single_issue_for_color_item,
  listing_issued_for_color,
  revert_issue_for_color,
} from '../../../../controllers/factory/colour/issue_for_colour/issue_for_colour.controller.js';

const issue_for_color_router = Router();

issue_for_color_router.post(
  '/issue',
  AuthMiddleware,
  add_issue_for_color_from_pressing
);
issue_for_color_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_issue_for_color
);
issue_for_color_router.post('/list', AuthMiddleware, listing_issued_for_color);
issue_for_color_router.get(
  '/fetch-single-issue-for-color/:id',
  AuthMiddleware,
  fetch_single_issue_for_color_item
);
// issue_for_color_router.post("/list-damage", AuthMiddleware, listing_color_damage);
// Issue for color export
issue_for_color_router.post(
  '/download-factory-issue-for-color-excel',
  AuthMiddleware,
  download_excel_issued_for_color
);
export default issue_for_color_router;
