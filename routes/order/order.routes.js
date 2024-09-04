import express from "express";
import {
  GetAllOrderNoList,
  GetGroupNoBasedOnItemNameAndItemCode,
  GetLatestOrderNo,
  GetViewDetails,
  SupplierMasterListInOrder,
} from "../../controllers/order/orderFormsList.js";
import {
  AddOrder,
  ListCompleteGroupOrders,
  ListCompleteRawOrders,
  ListPendingGroupOrders,
  ListPendingRawOrders,
  updateOrder,
} from "../../controllers/order/order.js";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";

const router = express.Router();

router.get("/get-latest-order-no", GetLatestOrderNo);
router.get("/get-view-details", GetViewDetails);
router.get("/get-supplier-list-in-order", SupplierMasterListInOrder);
router.get("/get-order-no-list", GetAllOrderNoList);
router.get(
  "/get-group-no-based-on-item-name-and-item-code",
  GetGroupNoBasedOnItemNameAndItemCode
);

router.post("/add-order", CheckRoleAndTokenAccess, AddOrder);
router.post(
  "/list-complete-raw-order",
  CheckRoleAndTokenAccess,
  ListCompleteRawOrders
);
router.post(
  "/list-pending-raw-order",
  CheckRoleAndTokenAccess,
  ListPendingRawOrders
);
router.post(
  "/list-complete-group-order",
  CheckRoleAndTokenAccess,
  ListCompleteGroupOrders
);
router.post(
  "/list-pending-group-order",
  CheckRoleAndTokenAccess,
  ListPendingGroupOrders
);
router.patch("/update-order", CheckRoleAndTokenAccess, updateOrder);

router.get("/get-latest-order-no", GetLatestOrderNo);
router.get(
  "/get-group-no-based-on-item-name-and-item-code",
  GetGroupNoBasedOnItemNameAndItemCode
);

export default router;
