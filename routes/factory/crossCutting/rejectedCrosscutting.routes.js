import express from "express";
import { add_rejected_issues_for_crosscutting, listing_rejected_crosscutting, revert_rejected_crosscutting } from "../../../controllers/factory/crossCutting/RejectedCrosscutting.controller.js";
import RolesPermissions from "../../../middlewares/permission.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
const rejected_crosscutting_router = express.Router();

rejected_crosscutting_router.post(
    "/add-reject-crosscutting/:issue_for_crosscutting_id",
    AuthMiddleware, RolesPermissions("crosscut_factory", "create"),
    add_rejected_issues_for_crosscutting
);

rejected_crosscutting_router.post(
    "/list-reject-crosscutting",
    AuthMiddleware, RolesPermissions("crosscut_factory", "view"),
    listing_rejected_crosscutting
);

rejected_crosscutting_router.post(
    "/revert-reject-crosscutting/:rejected_crosscutting_id",
    AuthMiddleware, RolesPermissions("crosscut_factory", "edit"),
    revert_rejected_crosscutting
);

export default rejected_crosscutting_router