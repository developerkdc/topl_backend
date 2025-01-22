import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  fleece_approve_invoice_details,
  fleece_reject_invoice_details,
  fleeceApproval_invoice_listing,
  fleeceApproval_item_listing_by_invoice,
} from '../../../controllers/inventory/fleece/fleeceApproval.controller.js';
const fleeceApprovalRouter = express.Router();

fleeceApprovalRouter.post(
  '/fleece-approval-invoice-listing',
  AuthMiddleware,
  fleeceApproval_invoice_listing
);

fleeceApprovalRouter.get(
  '/fleece-approval-item-listing-by-invoice/:_id/:invoice_id',
  AuthMiddleware,
  fleeceApproval_item_listing_by_invoice
);

fleeceApprovalRouter.post(
  '/fleece-approve_invoice_details/:_id/:invoice_id',
  AuthMiddleware,
  fleece_approve_invoice_details
);
fleeceApprovalRouter.post(
  '/fleece-reject_invoice_details/:_id/:invoice_id',
  AuthMiddleware,
  fleece_reject_invoice_details
);

export default fleeceApprovalRouter;
