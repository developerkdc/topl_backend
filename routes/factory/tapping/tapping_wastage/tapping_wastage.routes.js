import express from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { fetch_all_tapping_wastage } from '../../../../controllers/factory/tapping/tapping_wastage/tapping_wastage.controller.js';

const tapping_wastage_router = express.Router();

tapping_wastage_router.post(
  '/list-tapping-wastage',
  AuthMiddleware,
  fetch_all_tapping_wastage
);

export default tapping_wastage_router;
