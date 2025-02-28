import express from 'express';
import rawOrderRouter from './rawOrder.routes.js';
import decorativeOrderRouter from './decorative_order/decorativeOrder.routes.js';

const orderRouter = express.Router();

// router.get('/get-latest-order-no', GetLatestOrderNo);
// router.get('/get-view-details', GetViewDetails);
// router.get('/get-supplier-list-in-order', SupplierMasterListInOrder);
// router.get('/get-order-no-list', GetAllOrderNoList);
// router.get(
//   '/get-group-no-based-on-item-name-and-item-code',
//   GetGroupNoBasedOnItemNameAndItemCode
// );

// router.post('/add-order', CheckRoleAndTokenAccess, AddOrder);
// router.post(
//   '/list-complete-raw-order',
//   CheckRoleAndTokenAccess,
//   ListCompleteRawOrders
// );
// router.post(
//   '/list-pending-raw-order',
//   CheckRoleAndTokenAccess,
//   ListPendingRawOrders
// );
// router.post(
//   '/list-complete-group-order',
//   CheckRoleAndTokenAccess,
//   ListCompleteGroupOrders
// );
// router.post(
//   '/list-pending-group-order',
//   CheckRoleAndTokenAccess,
//   ListPendingGroupOrders
// );
// router.patch('/update-order', CheckRoleAndTokenAccess, updateOrder);

// router.get('/get-latest-order-no', GetLatestOrderNo);
// router.get(
//   '/get-group-no-based-on-item-name-and-item-code',
//   GetGroupNoBasedOnItemNameAndItemCode
// );

orderRouter.use('/raw-order', rawOrderRouter);
orderRouter.use('/decorative-order', decorativeOrderRouter);

export default orderRouter;
