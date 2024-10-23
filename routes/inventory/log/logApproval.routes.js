import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { logApproval_invoice_listing, logApproval_item_listing_by_invoice } from "../../../controllers/inventory/log/logApproval.controller.js";
const logApprovalRouter = express.Router();

logApprovalRouter.post(
    "/log-approval-invoice-listing",
    AuthMiddleware,
    logApproval_invoice_listing
);

logApprovalRouter.get(
    "/log-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    logApproval_item_listing_by_invoice
);

export default logApprovalRouter;