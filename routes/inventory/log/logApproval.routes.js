import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { approve_invoice_details, logApproval_invoice_listing, logApproval_item_listing_by_invoice, reject_invoice_details } from "../../../controllers/inventory/log/logApproval.controller.js";
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
    "/approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    approve_invoice_details
);
logApprovalRouter.post(
    "/reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    reject_invoice_details
);

export default logApprovalRouter;