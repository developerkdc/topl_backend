import { Router } from 'express';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { add_issue_for_order } from '../../../../../controllers/order/raw_order/issue_for_order/grouping_factory/issue_for_order.controller.js';

const grouping_factory_order_router = Router();

grouping_factory_order_router.post(
  '/issue-order',
  AuthMiddleware,
  add_issue_for_order
);

export default grouping_factory_order_router;
