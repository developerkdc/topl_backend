import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_canvas,
  download_excel_canvas_done,
  download_excel_canvas_history,
  fetch_single_canvas_done_item_with_issue_for_canvas_data,
  listing_canvas_done,
  listing_canvas_history,
  revert_canvas_done_items,
  update_canvas_done,
} from '../../../../controllers/factory/canavas/canvas_done/canvas_done.controller.js';

const canvas_done_router = Router();

canvas_done_router.post('/create', AuthMiddleware, create_canvas);
canvas_done_router.post('/update/:id', AuthMiddleware, update_canvas_done);
canvas_done_router.post('/list', AuthMiddleware, listing_canvas_done);
canvas_done_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_canvas_done_items
);
canvas_done_router.get(
  '/fetch-single-canvas-item/:id',
  AuthMiddleware,
  fetch_single_canvas_done_item_with_issue_for_canvas_data
);
canvas_done_router.post(
  '/history-list',
  AuthMiddleware,
  listing_canvas_history
);
// canvas_done_router.post("/add-to-damage/:id", AuthMiddleware, add_canvas_damage)

// Export APi Done
canvas_done_router.post(
  '/download-factory-canvas-done-excel',
  AuthMiddleware,
  download_excel_canvas_done
);
// Export Api Done
canvas_done_router.post(
  '/download-factory-canvas-history-excel',
  AuthMiddleware,
  download_excel_canvas_history
);

export default canvas_done_router;
