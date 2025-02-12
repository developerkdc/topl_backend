import { Router } from "express";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { create_dressing, fetch_all_dressing_done_items, fetch_all_dressing_done_items_by_other_details_id } from '../../../../controllers/factory/dressing/dressing_done/dressing.done.controller.js';
const dressing_done_router = Router()

dressing_done_router.post('/create-dressing', AuthMiddleware, create_dressing);
dressing_done_router.post("/list-dressing-done-items", AuthMiddleware, fetch_all_dressing_done_items)
dressing_done_router.get("/list-dressing-done-items-by-other-details/:id", AuthMiddleware, fetch_all_dressing_done_items_by_other_details_id)

export default dressing_done_router
