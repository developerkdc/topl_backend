import express from "express";
import { add_rejected_issues_for_crosscutting, listing_rejected_crosscutting, revert_rejected_crosscutting } from "../../../controllers/factory/crossCutting/RejectedCrosscutting.controller.js";
const rejected_crosscutting_router = express.Router();

rejected_crosscutting_router.post(
    "/add-reject-crosscutting/:issue_for_crosscutting_id",
    add_rejected_issues_for_crosscutting
);

rejected_crosscutting_router.post(
    "/list-reject-crosscutting",
    listing_rejected_crosscutting
);

rejected_crosscutting_router.post(
    "/revert-reject-crosscutting/:rejected_crosscutting_id",
    revert_rejected_crosscutting
);

export default rejected_crosscutting_router