import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  veneer_approve_invoice_details,
  veneer_reject_invoice_details,
  veneerApproval_invoice_listing,
  veneerApproval_item_listing_by_invoice,
} from '../../../controllers/inventory/venner/veneerApproval.controller.js';
const veneerApprovalRouter = express.Router();

veneerApprovalRouter.post(
  '/veneer-approval-invoice-listing',
  AuthMiddleware,
  veneerApproval_invoice_listing
);

veneerApprovalRouter.get(
  '/veneer-approval-item-listing-by-invoice/:_id/:invoice_id',
  AuthMiddleware,
  veneerApproval_item_listing_by_invoice
);

veneerApprovalRouter.post(
  '/veneer-approve_invoice_details/:_id/:invoice_id',
  AuthMiddleware,
  veneer_approve_invoice_details
);
veneerApprovalRouter.post(
  '/veneer-reject_invoice_details/:_id/:invoice_id',
  AuthMiddleware,
  veneer_reject_invoice_details
);

export default veneerApprovalRouter;
