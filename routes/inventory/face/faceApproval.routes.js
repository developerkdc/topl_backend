import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { face_approve_invoice_details, face_reject_invoice_details, faceApproval_invoice_listing, faceApproval_item_listing_by_invoice } from "../../../controllers/inventory/face/faceApproval.controller.js";
const faceApprovalRouter = express.Router();

faceApprovalRouter.post(
    "/face-approval-invoice-listing",
    AuthMiddleware,
    faceApproval_invoice_listing
);

faceApprovalRouter.get(
    "/face-approval-item-listing-by-invoice/:_id/:invoice_id",
    AuthMiddleware,
    faceApproval_item_listing_by_invoice
);

faceApprovalRouter.post(
    "/face-approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    face_approve_invoice_details
);
faceApprovalRouter.post(
    "/face-reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    face_reject_invoice_details
);

export default faceApprovalRouter;