import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { veneerApproval_invoice_listing, veneerApproval_item_listing_by_invoice } from "../../../controllers/inventory/venner/veneerApproval.controller.js";
// import { veneerApproval_invoice_listing, veneerApproval_item_listing_by_invoice } from "../../../controllers/inventory/veneer/veneerApproval.controller.js";
const veneerApprovalRouter = express.Router();

veneerApprovalRouter.post(
    "/veneer-approval-invoice-listing",
    AuthMiddleware,
    veneerApproval_invoice_listing
);

veneerApprovalRouter.get(
    "/veneer-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    veneerApproval_item_listing_by_invoice
);

export default veneerApprovalRouter;