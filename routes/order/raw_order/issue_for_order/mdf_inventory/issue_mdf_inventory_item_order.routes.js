import  {Router} from 'express';
import { add_issue_for_order } from '../../../../../controllers/order/raw_order/issue_for_order/mdf_inventory/issue_for_order.controller.js';
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
const mdf_inventory_order_router = Router();

mdf_inventory_order_router.post(
    '/issue-order',
    AuthMiddleware,
    add_issue_for_order
  );
export default mdf_inventory_order_router;
