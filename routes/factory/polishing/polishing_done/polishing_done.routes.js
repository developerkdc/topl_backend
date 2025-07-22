import { Router } from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  create_polishing,
  download_excel_polishing_done,
  download_excel_polishing_history,
  fetch_single_polishing_done_item_with_issue_for_polishing_data,
  listing_polishing_done,
  listing_polishing_history,
  revert_polishing_done_items,
  update_polishing_done,
} from '../../../../controllers/factory/polishing/polishing_done/polishing_done.controller.js';

const polishing_done_router = Router();

polishing_done_router.post('/create', AuthMiddleware, create_polishing);
polishing_done_router.post(
  '/update/:id',
  AuthMiddleware,
  update_polishing_done
);
polishing_done_router.post('/list', AuthMiddleware, listing_polishing_done);
polishing_done_router.post(
  '/revert/:id',
  AuthMiddleware,
  revert_polishing_done_items
);
polishing_done_router.get(
  '/fetch-single-polishing-item/:id',
  AuthMiddleware,
  fetch_single_polishing_done_item_with_issue_for_polishing_data
);

// polishing_done_router.post("/add-to-damage/:id", AuthMiddleware, add_polishing_damage)
polishing_done_router.post(
  '/history-list',
  AuthMiddleware,
  listing_polishing_history
);

// Polishing Done Export api
polishing_done_router.post('/download-factory-polishing-done-excel', AuthMiddleware, download_excel_polishing_done);

// Polishing History Export api
polishing_done_router.post('/download-factory-polishing-history-excel', AuthMiddleware, download_excel_polishing_history);
export default polishing_done_router;
