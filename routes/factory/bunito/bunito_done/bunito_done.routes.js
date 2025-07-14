import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_bunito,
  download_excel_bunito_done,
  download_excel_bunito_history,
  fetch_single_bunito_done_item_with_issue_for_bunito_data,
  listing_bunito_done, listing_bunito_history,
  revert_bunito_done_items,
  update_bunito_done,
} from '../../../../controllers/factory/bunito/bunito_done/bunito_done.controller.js';

const bunito_done_router = Router();

bunito_done_router.post('/create', AuthMiddleware, create_bunito);
bunito_done_router.post('/update/:id', AuthMiddleware, update_bunito_done);
bunito_done_router.post('/list', AuthMiddleware, listing_bunito_done);
bunito_done_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_bunito_done_items
);
bunito_done_router.get(
  '/fetch-single-bunito-item/:id',
  AuthMiddleware,
  fetch_single_bunito_done_item_with_issue_for_bunito_data
);

bunito_done_router.post('/history-list', AuthMiddleware, listing_bunito_history);

// Bunito done download excel api
bunito_done_router.post('/download-factory-bunito-done-excel', AuthMiddleware, download_excel_bunito_done);

// Bunito History download Excel Api
bunito_done_router.post('/download-factory-bunito-history-excel', AuthMiddleware, download_excel_bunito_history);
export default bunito_done_router;
