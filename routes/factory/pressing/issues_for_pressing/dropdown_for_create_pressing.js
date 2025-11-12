import express from 'express';
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import {
  fetch_all_fleece_paper_inward_sr_no,
  fetch_all_fleece_paper_sr_no_by_inward_sr_no,
  fetch_all_group_no_based_on_issued_status,
  // fetch_base_details_details_based_item_name,
  fetch_fleece_paper_details_by_id,
  fetch_issued_for_pressing_details_based_on_group_no,
  getMdfDetailsByPalletNo,
  getMdfPalletDropdown,
  getPlywoodDetailsByPalletNo,
  getPlywoodPalletDropdown,
  getPlywoodProductionItemDetails,
  getPlywoodProductionItemNameDropdown,
  getPlywoodResizingItemDetails,
  getPlywoodResizingItemNameDropdown,
  issue_for_pressing_orderNo,
  pressing_item_no_dropdown,
  // item_name_dropdown_for_base_details,
} from '../../../../controllers/factory/pressing/issues_for_pressing/dropdown_for_create_pressing.js';

const dropdown_for_pressing_router = express.Router();

dropdown_for_pressing_router.get(
  '/group-no-dropdown',
  AuthMiddleware,
  fetch_all_group_no_based_on_issued_status
);
dropdown_for_pressing_router.get(
  '/issued-item-detail-by-group-no/:id',
  AuthMiddleware,
  fetch_issued_for_pressing_details_based_on_group_no
);

// For Plywood
dropdown_for_pressing_router.get(
  '/plywood/pallet-dropdown',
  getPlywoodPalletDropdown
);
dropdown_for_pressing_router.get(
  '/plywood/details/:id',
  getPlywoodDetailsByPalletNo
);

// For MDF
dropdown_for_pressing_router.get('/mdf/pallet-dropdown', getMdfPalletDropdown);
dropdown_for_pressing_router.get('/mdf/details/:id', getMdfDetailsByPalletNo);

//create pressing Base type PLYWOOD
// Consumed from from resizing
dropdown_for_pressing_router.get(
  '/plywood/resizing/item-name-dropdown',
  getPlywoodResizingItemNameDropdown
);
dropdown_for_pressing_router.get(
  '/plywood/resizing/item/:id',
  getPlywoodResizingItemDetails
);

// consume from production
dropdown_for_pressing_router.get(
  '/plywood/production/item-name-dropdown',
  getPlywoodProductionItemNameDropdown
);
dropdown_for_pressing_router.get(
  '/plywood/production/item/:id',
  getPlywoodProductionItemDetails
);

dropdown_for_pressing_router.get(
  '/fetch-all-fleece-paper-inward-sr-no',
  AuthMiddleware,
  fetch_all_fleece_paper_inward_sr_no
);
dropdown_for_pressing_router.get(
  '/fetch-all-fleece_paper-sr-no-by-inward-sr-no/:id',
  AuthMiddleware,
  fetch_all_fleece_paper_sr_no_by_inward_sr_no
);
dropdown_for_pressing_router.get(
  '/fetch-fleece-paper-details-by-id/:id',
  AuthMiddleware,
  fetch_fleece_paper_details_by_id
);
dropdown_for_pressing_router.get(
  '/issue-for-pressing-order-no-dropdown',
  AuthMiddleware,
  issue_for_pressing_orderNo
);

dropdown_for_pressing_router.get(
  '/issue-for-pressing-Itemno-dropdown',
  AuthMiddleware,
  pressing_item_no_dropdown
);


export default dropdown_for_pressing_router;
