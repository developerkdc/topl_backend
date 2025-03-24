import { Router } from "express";
import { create_resizing, update_resizing_done, fetch_single_resizing_done_item_with_issue_for_resizing_data, listing_resizing_done, revert_resizing_done_items } from "../../../../controllers/factory/plywood_resizing/resizing_done/resizing.done.controller.js";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';

const resizing_done_router = Router();

resizing_done_router.post("/create", AuthMiddleware, create_resizing)
resizing_done_router.post("/update/:id", AuthMiddleware, update_resizing_done)
resizing_done_router.post("/list", AuthMiddleware, listing_resizing_done)
resizing_done_router.post("/revert/:id", AuthMiddleware, revert_resizing_done_items)
resizing_done_router.get("/fetch-single-resizing-item/:id", AuthMiddleware, fetch_single_resizing_done_item_with_issue_for_resizing_data)

export default resizing_done_router