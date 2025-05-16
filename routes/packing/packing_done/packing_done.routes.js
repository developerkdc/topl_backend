import { Router } from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
const packing_done_router = Router();

// packing_done_router.post('/create', AuthMiddleware, create_packing);
// packing_done_router.post('/edit/:id', AuthMiddleware, edit_packing_details);
// packing_done_router.post('/list', AuthMiddleware, listing_packing_done);
packing_done_router.get(
  '/fetch-single-packing/:id',
  AuthMiddleware,
//   fetch_single_packing
);
export default packing_done_router;
