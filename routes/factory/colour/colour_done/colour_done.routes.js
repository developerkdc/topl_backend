import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_color,
  download_excel_color_done,
  download_excel_color_history,
  fetch_single_color_done_item_with_issue_for_color_data,
  listing_color_done,
  listing_color_history,
  revert_color_done_items,
  update_color_done,
} from '../../../../controllers/factory/colour/colour_done/colour_done.controller.js';

const color_done_router = Router();

color_done_router.post('/create', AuthMiddleware, create_color);
color_done_router.post('/update/:id', AuthMiddleware, update_color_done);
color_done_router.post('/list', AuthMiddleware, listing_color_done);
color_done_router.post('/revert/:id', AuthMiddleware, revert_color_done_items);
color_done_router.get(
  '/fetch-single-color-item/:id',
  AuthMiddleware,
  fetch_single_color_done_item_with_issue_for_color_data
);

// color_done_router.post("/add-to-damage/:id", AuthMiddleware, add_color_damage)
color_done_router.post('/history-list', AuthMiddleware, listing_color_history);

// Color done export api
color_done_router.post('/download-factory-color-done-excel', AuthMiddleware, download_excel_color_done);



// Color History export api
color_done_router.post('/download-factory-color-history-excel', AuthMiddleware, download_excel_color_history);

export default color_done_router;
