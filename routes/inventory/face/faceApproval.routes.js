import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { faceApproval_invoice_listing, faceApproval_item_listing_by_invoice } from "../../../controllers/inventory/face/faceApproval.controller.js";
const faceApprovalRouter = express.Router();

faceApprovalRouter.post(
    "/face-approval-invoice-listing",
    AuthMiddleware,
    faceApproval_invoice_listing
);

faceApprovalRouter.get(
    "/face-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    faceApproval_item_listing_by_invoice
);

export default faceApprovalRouter;