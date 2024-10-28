import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { core_approve_invoice_details, core_reject_invoice_details, coreApproval_invoice_listing, coreApproval_item_listing_by_invoice } from "../../../controllers/inventory/core/coreApproval.controller.js";
const coreApprovalRouter = express.Router();

coreApprovalRouter.post(
    "/core-approval-invoice-listing",
    AuthMiddleware,
    coreApproval_invoice_listing
);

coreApprovalRouter.get(
    "/core-approval-item-listing-by-invoice/:_id/:invoice_id",
    AuthMiddleware,
    coreApproval_item_listing_by_invoice
);

coreApprovalRouter.post(
    "/core-approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    core_approve_invoice_details
);
coreApprovalRouter.post(
    "/core-reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    core_reject_invoice_details
);

export default coreApprovalRouter;