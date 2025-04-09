import { Router } from "express";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { add_issue_for_cnc_from_pressing, fetch_single_issue_for_cnc_item, listing_issued_for_cnc, revert_issue_for_cnc } from "../../../../controllers/factory/cnc/issue_for_cnc/issue_for_cnc.controller.js";
import { listing_cnc_damage } from "../../../../controllers/factory/cnc/cnc_damage/cnc_damage.controller.js";

const issue_for_cnc_router = Router();

issue_for_cnc_router.post("/issue", AuthMiddleware, add_issue_for_cnc_from_pressing);
issue_for_cnc_router.post("/revert/:id", AuthMiddleware, revert_issue_for_cnc);
issue_for_cnc_router.post("/list", AuthMiddleware, listing_issued_for_cnc);
issue_for_cnc_router.get("/fetch-single-issue-for-cnc/:id", AuthMiddleware, fetch_single_issue_for_cnc_item);
// issue_for_cnc_router.post("/list-damage", AuthMiddleware, listing_cnc_damage);

export default issue_for_cnc_router;