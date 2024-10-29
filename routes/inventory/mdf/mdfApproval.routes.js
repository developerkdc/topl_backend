import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { mdf_approve_invoice_details, mdf_reject_invoice_details, mdfApproval_invoice_listing, mdfApproval_item_listing_by_invoice } from "../../../controllers/inventory/mdf/mdfApproval.controller.js";
const mdfApprovalRouter = express.Router();

mdfApprovalRouter.post(
    "/mdf-approval-invoice-listing",
    AuthMiddleware,
    mdfApproval_invoice_listing
);

mdfApprovalRouter.get(
    "/mdf-approval-item-listing-by-invoice/:_id/:invoice_id",
    AuthMiddleware,
    mdfApproval_item_listing_by_invoice
);

mdfApprovalRouter.post(
    "/mdf-approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    mdf_approve_invoice_details
);
mdfApprovalRouter.post(
    "/mdf-reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    mdf_reject_invoice_details
);

export default mdfApprovalRouter;