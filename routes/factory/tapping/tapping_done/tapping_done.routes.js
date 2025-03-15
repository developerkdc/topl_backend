import express from "express";
import { add_tapping_details, edit_tapping_details, fetch_all_tapping_done_items } from "../../../../controllers/factory/tapping/tapping_done/tapping_done.controller.js";
import AuthMiddleware from "../../../../middlewares/verifyToken.js";

const tapping_done_router = express.Router();

tapping_done_router.post(
    '/add-tapping-done',
    AuthMiddleware,
    add_tapping_details
);
tapping_done_router.patch(
    '/edit-tapping-done/:tapping_done_id',
    AuthMiddleware,
    edit_tapping_details
);
tapping_done_router.post(
    '/list-tapping-done-items',
    AuthMiddleware,
    fetch_all_tapping_done_items
);

export default tapping_done_router