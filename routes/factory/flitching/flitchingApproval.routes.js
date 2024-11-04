import express from "express";
import { log_approve_invoice_details, log_reject_invoice_details, logApproval_invoice_listing, logApproval_item_listing_by_invoice } from "../../../controllers/inventory/log/logApproval.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { crosscut_reject, crosscutting_approval_item_listing_by_unique_id, crosscutting_approve, crossCuttting_approval_listing } from "../../../controllers/factory/crossCutting/crossCuttingApproval.controller.js";
const flitchingApprovalRouter = express.Router();

flitchingApprovalRouter.post(
    "/crosscut-approval-listing",
    AuthMiddleware,
    crossCuttting_approval_listing
);

flitchingApprovalRouter.get(
    "/crosscut-approval-item-listing-by-unique-id/:_id",
    AuthMiddleware,
    crosscutting_approval_item_listing_by_unique_id
);

flitchingApprovalRouter.post(
    "/crosscut-approve-details/:_id/:issued_for_cutting_id",
    AuthMiddleware,
    crosscutting_approve
);
flitchingApprovalRouter.post(
    "/log-reject_invoice_details/:_id/:issued_for_cutting_id",
    AuthMiddleware,
    crosscut_reject
);

export default flitchingApprovalRouter;