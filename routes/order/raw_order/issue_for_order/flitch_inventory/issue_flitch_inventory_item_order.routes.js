import { Router } from "express";
import AuthMiddleware from '../../../../../middlewares/verifyToken.js';
import { add_issue_for_order, revert_issued_item_by_id } from "../../../../../controllers/order/raw_order/issue_for_order/flitch_inventory/issue_for_order.controller.js";

const flitch_inventory_order_router = Router();

flitch_inventory_order_router.post("/issue-order", AuthMiddleware, add_issue_for_order)
flitch_inventory_order_router.post("/revert-order/:id", AuthMiddleware, revert_issued_item_by_id)
export default flitch_inventory_order_router