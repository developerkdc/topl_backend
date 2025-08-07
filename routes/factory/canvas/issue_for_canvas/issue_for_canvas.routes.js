import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  add_issue_for_canvas_from_pressing,
  download_excel_issued_for_canvas,
  fetch_single_issue_for_canvas_item,
  listing_issued_for_canvas,
  revert_issue_for_canvas,
} from '../../../../controllers/factory/canavas/issue_for_canvas/issue_for_canvas.controller.js';

const issue_for_canvas_router = Router();

issue_for_canvas_router.post(
  '/issue',
  AuthMiddleware,
  add_issue_for_canvas_from_pressing
);
issue_for_canvas_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_issue_for_canvas
);
issue_for_canvas_router.post(
  '/list',
  AuthMiddleware,
  listing_issued_for_canvas
);
issue_for_canvas_router.get(
  '/fetch-single-issue-for-canvas/:id',
  AuthMiddleware,
  fetch_single_issue_for_canvas_item
);
// issue_for_canvas_router.post("/list-damage", AuthMiddleware, listing_canvas_damage);

// Export CSV API
issue_for_canvas_router.post(
  '/download-factory-issue-for-canvas-excel',
  AuthMiddleware,
  download_excel_issued_for_canvas
);
export default issue_for_canvas_router;
