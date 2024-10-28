import express from "express";
import { log_approve_invoice_details, log_reject_invoice_details, logApproval_invoice_listing, logApproval_item_listing_by_invoice } from "../../../controllers/inventory/log/logApproval.controller.js";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
const logApprovalRouter = express.Router();

logApprovalRouter.post(
    "/log-approval-invoice-listing",
    AuthMiddleware,
    logApproval_invoice_listing
);

logApprovalRouter.get(
    "/log-approval-item-listing-by-invoice/:_id/:invoice_id",
    AuthMiddleware,
    logApproval_item_listing_by_invoice
);

logApprovalRouter.post(
    "/log-approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    log_approve_invoice_details
);
logApprovalRouter.post(
    "/log-reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    log_reject_invoice_details
);

export default logApprovalRouter;