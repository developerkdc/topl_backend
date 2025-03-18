import { Router } from 'express';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import {
  add_issue_for_order
} from '../../../../../controllers/order/raw_order/issue_for_order/flitching_factory/issue_for_order.controller.js';

const flitching_factory_order_router = Router();

flitching_factory_order_router.post(
  '/issue-order',
  AuthMiddleware,
  add_issue_for_order
);

export default flitching_factory_order_router;
