import { Router } from "express";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { create_colour, fetch_single_colour_done_item_with_issue_for_colour_data, listing_colour_done, revert_colour_done_items, update_colour_done } from "../../../../controllers/factory/colour/colour_done/colour_done.controller.js";
import { add_colour_damage } from "../../../../controllers/factory/colour/colour_damage/colour_damage.controller.js";

const colour_done_router = Router();

colour_done_router.post("/create", AuthMiddleware, create_colour)
colour_done_router.post("/update/:id", AuthMiddleware, update_colour_done)
colour_done_router.post("/list", AuthMiddleware, listing_colour_done)
colour_done_router.post("/revert/:id", AuthMiddleware, revert_colour_done_items)
colour_done_router.get("/fetch-single-colour-item/:id", AuthMiddleware, fetch_single_colour_done_item_with_issue_for_colour_data)

colour_done_router.post("/add-to-damage/:id", AuthMiddleware, add_colour_damage)


export default colour_done_router;