import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import RolesPermissions from "../../../middlewares/permission.js";
import { otherGoodsApproval_invoice_listing, otherGoodsApproval_item_listing_by_invoice } from "../../../controllers/inventory/otherGoods/otherGoodsApproval.controller.js";
const otherGoodsApprovalRouter = express.Router();

otherGoodsApprovalRouter.post(
    "/otherGoods-approval-invoice-listing",
    AuthMiddleware,
    otherGoodsApproval_invoice_listing
);

otherGoodsApprovalRouter.get(
    "/otherGoods-approval-item-listing-by-invoice/:invoice_id",
    AuthMiddleware,
    otherGoodsApproval_item_listing_by_invoice
);

export default otherGoodsApprovalRouter;