import express from "express";
import { add_tapping_details, edit_tapping_details, fetch_all_details_by_tapping_id, fetch_all_tapping_done_items, revert_tapping_done_details } from "../../../../controllers/factory/tapping/tapping_done/tapping_done.controller.js";
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
tapping_done_router.get(
    '/fetch-single-tapping-done-details/:id',
    AuthMiddleware,
    fetch_all_details_by_tapping_id
);
tapping_done_router.post(
    '/revert-tapping-done-details/:id',
    AuthMiddleware,
    revert_tapping_done_details
);

export default tapping_done_router