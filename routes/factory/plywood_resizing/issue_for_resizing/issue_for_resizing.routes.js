import { Router } from "express";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { add_issue_for_resizing_from_plywood, revert_issue_for_resizing, fetch_single_issue_for_resizing_item, listing_issued_for_resizing } from "../../../../controllers/factory/plywood_resizing/issue_for_resizing/issue_for_resizing.controller.js";
import { listing_resizing_damage } from "../../../../controllers/factory/plywood_resizing/resizing_damage/resizing_damage.controller.js";

const issue_for_issue_for_resizing_router = Router();

issue_for_issue_for_resizing_router.post("/issue", AuthMiddleware, add_issue_for_resizing_from_plywood);
issue_for_issue_for_resizing_router.post("/revert/:id", AuthMiddleware, revert_issue_for_resizing);
issue_for_issue_for_resizing_router.post("/list", AuthMiddleware, listing_issued_for_resizing);
issue_for_issue_for_resizing_router.get("/fetch-single-issue-for-resizing/:id", AuthMiddleware, fetch_single_issue_for_resizing_item);
issue_for_issue_for_resizing_router.post("/list-damage", AuthMiddleware, listing_resizing_damage);


export default issue_for_issue_for_resizing_router