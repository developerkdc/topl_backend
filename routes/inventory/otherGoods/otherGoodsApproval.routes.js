import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { otherGoods_approve_invoice_details, otherGoods_reject_invoice_details, otherGoodsApproval_invoice_listing, otherGoodsApproval_item_listing_by_invoice } from "../../../controllers/inventory/otherGoods/otherGoodsApproval.controller.js";
const otherGoodsApprovalRouter = express.Router();

otherGoodsApprovalRouter.post(
    "/otherGoods-approval-invoice-listing",
    AuthMiddleware,
    otherGoodsApproval_invoice_listing
);

otherGoodsApprovalRouter.get(
    "/otherGoods-approval-item-listing-by-invoice/:_id/:invoice_id",
    AuthMiddleware,
    otherGoodsApproval_item_listing_by_invoice
);

otherGoodsApprovalRouter.post(
    "/otherGoods-approve_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    otherGoods_approve_invoice_details
);
otherGoodsApprovalRouter.post(
    "/otherGoods-reject_invoice_details/:_id/:invoice_id",
    AuthMiddleware,
    otherGoods_reject_invoice_details
);

export default otherGoodsApprovalRouter;