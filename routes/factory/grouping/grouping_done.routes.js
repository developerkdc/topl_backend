import express from 'express';
import {
  add_grouping_done,
  add_grouping_done_damaged,
  edit_grouping_done,
  fetch_all_damaged_grouping_done_items,
  fetch_all_details_by_grouping_done_id,
  fetch_all_details_by_grouping_done_item_id,
  fetch_all_grouping_done_items,
  fetch_all_grouping_history_details,
  group_no_dropdown,
  group_no_dropdown_for_photo_master,
  recreate_grouping_done_items,
  revert_all_grouping_done,
  revert_grouping_done_damaged,
  download_excel_factory_grouping_done,
  download_excel_factory_grouping_damage,
  download_excel_factory_grouping_history,
  group_no_dropdown_for_hybrid_photo_master
} from '../../../controllers/factory/grouping/grouping_done.controller.js';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  fetch_all_group_no_by_item_name,
  fetch_group_details_by_id,
  issue_for_tapping_from_grouping_for_order,
} from '../../../controllers/factory/grouping/grouping.issue_for_order.controller.js';

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
groupingDoneRouter.post(
  '/list-grouping-done-items-history',
  AuthMiddleware,
  fetch_all_grouping_history_details
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
groupingDoneRouter.get('/group-no-dropdown', AuthMiddleware, group_no_dropdown);

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

//issue for order dropdown
groupingDoneRouter.get(
  '/list-group-no/:id',
  AuthMiddleware,
  fetch_all_group_no_by_item_name
);
groupingDoneRouter.get(
  '/fetch-group-details/:id',
  AuthMiddleware,
  fetch_group_details_by_id
);

groupingDoneRouter.post(
  '/issue-for-tapping-from-grouping-for-order/:grouping_done_item_id',
  AuthMiddleware,
  issue_for_tapping_from_grouping_for_order
);

//group no dropdown for photo master

groupingDoneRouter.get(
  '/group-no-dropdown-for-photo-master',
  AuthMiddleware,
  group_no_dropdown_for_photo_master
);

groupingDoneRouter.post(
  '/download-factory-grouping-done-excel',
  AuthMiddleware,
  download_excel_factory_grouping_done
);

groupingDoneRouter.post(
  '/download-factory-grouping-damage-excel',
  AuthMiddleware,
  download_excel_factory_grouping_damage
);


groupingDoneRouter.post(
  '/download-factory-grouping-history-excel',
  AuthMiddleware,
  download_excel_factory_grouping_history
);

export default groupingDoneRouter;
