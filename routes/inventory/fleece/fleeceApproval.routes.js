import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { fleeceApproval_invoice_listing, fleeceApproval_item_listing_by_invoice } from "../../../controllers/inventory/fleece/fleeceApproval.controller.js";
const fleeceApprovalRouter = express.Router();

fleeceApprovalRouter.post(
    "/fleece-approval-invoice-listing",
    AuthMiddleware,
    fleeceApproval_invoice_listing
);

fleeceApprovalRouter.get(
    "/fleece-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    fleeceApproval_item_listing_by_invoice
);

export default fleeceApprovalRouter;