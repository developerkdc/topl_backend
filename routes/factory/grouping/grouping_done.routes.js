import express from 'express';
import { add_grouping_done, add_grouping_done_damaged, edit_grouping_done, fetch_all_damaged_grouping_done_items, fetch_all_details_by_grouping_done_id, fetch_all_details_by_grouping_done_item_id, fetch_all_grouping_done_items, recreate_grouping_done_items, revert_all_grouping_done, revert_grouping_done_damaged } from '../../../controllers/factory/grouping/grouping_done.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';

const groupingDoneRouter = express.Router();

groupingDoneRouter.post(
    '/add-grouping-done',
    AuthMiddleware,
    add_grouping_done
);
groupingDoneRouter.patch(
    '/edit-grouping-done/:grouping_done_id',
    AuthMiddleware,
    edit_grouping_done
);
groupingDoneRouter.post(
    '/list-grouping-done-items',
    AuthMiddleware,
    fetch_all_grouping_done_items
);
groupingDoneRouter.get(
    '/fetch-single-grouping-done-details/:id',
    AuthMiddleware,
    fetch_all_details_by_grouping_done_id
);
groupingDoneRouter.get(
    '/fetch-single-grouping-done-item-details/:id',
    AuthMiddleware,
    fetch_all_details_by_grouping_done_item_id
);
groupingDoneRouter.post(
    '/revert-grouping-done-details/:id',
    AuthMiddleware,
    revert_all_grouping_done
);

//damaged
groupingDoneRouter.post(
    '/list-grouping-done-damaged-items',
    AuthMiddleware,
    fetch_all_damaged_grouping_done_items
);
groupingDoneRouter.post(
    '/add-grouping-done-damaged-items/:id',
    AuthMiddleware,
    add_grouping_done_damaged
);
groupingDoneRouter.post(
    '/revert-grouping-done-damaged-items/:id',
    AuthMiddleware,
    revert_grouping_done_damaged
);

//recreate grouping
groupingDoneRouter.post(
    '/recreate-grouping-done-items/:id',
    AuthMiddleware,
    recreate_grouping_done_items
);

export default groupingDoneRouter;
