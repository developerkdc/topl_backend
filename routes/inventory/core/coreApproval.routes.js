import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { coreApproval_invoice_listing, coreApproval_item_listing_by_invoice } from "../../../controllers/inventory/core/coreApproval.controller.js";
const coreApprovalRouter = express.Router();

coreApprovalRouter.post(
    "/core-approval-invoice-listing",
    AuthMiddleware,
    coreApproval_invoice_listing
);

coreApprovalRouter.get(
    "/core-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    coreApproval_item_listing_by_invoice
);

export default coreApprovalRouter;