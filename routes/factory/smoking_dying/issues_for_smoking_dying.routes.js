import express from 'express';
import { add_issue_for_smoking_dying_from_veneer_inventory, fetch_single_issued_for_smoking_dying_item, listing_issued_for_smoking_dying, revert_issued_for_smoking_dying_item } from '../../../controllers/factory/smoking_dying/issues_for_smoking_dying.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
const smokingDyingRouter = express.Router();

smokingDyingRouter.post(
    '/add-veneer-item-issue-for-smoking-dying',
    AuthMiddleware,
    add_issue_for_smoking_dying_from_veneer_inventory
);

smokingDyingRouter.post(
    '/listing-issue-for-smoking-dying',
    AuthMiddleware,
    listing_issued_for_smoking_dying
);

smokingDyingRouter.get(
    '/fetch-single-issue-for-smoking-dying/:id',
    AuthMiddleware,
    fetch_single_issued_for_smoking_dying_item
);

smokingDyingRouter.post(
    '/revert-issue-for-smoking-dying/:id',
    AuthMiddleware,
    revert_issued_for_smoking_dying_item
  );

export default smokingDyingRouter;
