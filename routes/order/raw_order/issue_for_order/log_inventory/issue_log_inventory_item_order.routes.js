import { Router } from "express";
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { add_issue_for_order } from "../../../../../controllers/order/raw_order/issue_for_order/log_inventory/issue_for_order.controller.js";

const log_inventory_order_router = Router();

log_inventory_order_router.post("/issue-order", AuthMiddleware, add_issue_for_order)
export default log_inventory_order_router