import { Router } from "express";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { add_issue_for_colour_from_pressing, fetch_single_issue_for_colour_item, listing_issued_for_colour, revert_issue_for_colour } from "../../../../controllers/factory/colour/issue_for_colour/issue_for_colour.controller.js";
import { listing_colour_damage } from "../../../../controllers/factory/colour/colour_damage/colour_damage.controller.js";

const issue_for_colour_router = Router();

issue_for_colour_router.post("/issue", AuthMiddleware, add_issue_for_colour_from_pressing);
issue_for_colour_router.post("/revert/:id", AuthMiddleware, revert_issue_for_colour);
issue_for_colour_router.post("/list", AuthMiddleware, listing_issued_for_colour);
issue_for_colour_router.get("/fetch-single-issue-for-colour/:id", AuthMiddleware, fetch_single_issue_for_colour_item);
issue_for_colour_router.post("/list-damage", AuthMiddleware, listing_colour_damage);

export default issue_for_colour_router;