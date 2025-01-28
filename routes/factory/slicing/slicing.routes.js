import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { addIssueForSlicingFromFlitchInventory, listing_issued_for_slicing_inventory } from '../../../controllers/factory/slicing/issuedForSlicing.controller.js';




const issueForSlicingRouter = express.Router();

issueForSlicingRouter.post(
    '/add-issue-for-slicing',
    AuthMiddleware,
    addIssueForSlicingFromFlitchInventory
);
issueForSlicingRouter.post(
    '/list-issue-for-slicing',
    AuthMiddleware,
    listing_issued_for_slicing_inventory
);

export default issueForSlicingRouter;
