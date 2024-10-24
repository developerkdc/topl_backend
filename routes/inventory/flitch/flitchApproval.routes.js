import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { flitchApproval_invoice_listing, flitchApproval_item_listing_by_invoice } from "../../../controllers/inventory/flitch/flitchApproval.controller.js";
const flitchApprovalRouter = express.Router();

flitchApprovalRouter.post(
    "/flitch-approval-invoice-listing",
    AuthMiddleware,
    flitchApproval_invoice_listing
);

flitchApprovalRouter.get(
    "/flitch-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    flitchApproval_item_listing_by_invoice
);

export default flitchApprovalRouter;