import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { flitch_approve_invoice_details, flitch_reject_invoice_details, flitchApproval_invoice_listing, flitchApproval_item_listing_by_invoice } from "../../../controllers/inventory/flitch/flitchApproval.controller.js";
const flitchApprovalRouter = express.Router();

flitchApprovalRouter.post(
    "/flitch-approval-invoice-listing",
    AuthMiddleware,
    flitchApproval_invoice_listing
);

flitchApprovalRouter.get(
    "/flitch-approval-item-listing-by-invoice/:_id/:invoice_id",
    AuthMiddleware,
    flitchApproval_item_listing_by_invoice
);

flitchApprovalRouter.post(
    "/flitch-approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    flitch_approve_invoice_details
);
flitchApprovalRouter.post(
    "/flitch-reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    flitch_reject_invoice_details
);

export default flitchApprovalRouter;