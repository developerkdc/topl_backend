import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { mdfApproval_invoice_listing, mdfApproval_item_listing_by_invoice } from "../../../controllers/inventory/mdf/mdfApproval.controller.js";
const mdfApprovalRouter = express.Router();

mdfApprovalRouter.post(
    "/mdf-approval-invoice-listing",
    AuthMiddleware,
    mdfApproval_invoice_listing
);

mdfApprovalRouter.get(
    "/mdf-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    mdfApproval_item_listing_by_invoice
);

export default mdfApprovalRouter;