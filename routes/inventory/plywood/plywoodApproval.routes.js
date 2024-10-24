import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { plywoodApproval_invoice_listing, plywoodApproval_item_listing_by_invoice } from "../../../controllers/inventory/plywood/plywoodApproval.controller.js";
const plywoodApprovalRouter = express.Router();

plywoodApprovalRouter.post(
    "/plywood-approval-invoice-listing",
    AuthMiddleware,
    plywoodApproval_invoice_listing
);

plywoodApprovalRouter.get(
    "/plywood-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    plywoodApproval_item_listing_by_invoice
);

export default plywoodApprovalRouter;