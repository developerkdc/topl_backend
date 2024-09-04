import express from "express";
import CheckRoleAndTokenAccess from "../../../middlewares/permission.js";
import {
  AddOtherGoods,
  EditOtherGoods,
  FetchOtherGoods,
  FetchOtherGoodsConsumption,
  UpdateOtherGoods,
} from "../../../controllers/inventory/otherGoods/otherGoods.js";
import { ListOtherGoodsLogs } from "../../../controllers/logs/Inventory/OtherGoods/otherGoodsLogs.js";
import { ListOtherGoodsConsumedLogs } from "../../../controllers/logs/Inventory/OtherGoods/otherGoodsConsumedLogs.js";

const router = express.Router();
router.post("/add-other-goods", CheckRoleAndTokenAccess, AddOtherGoods);
router.post("/edit-other-goods", CheckRoleAndTokenAccess, EditOtherGoods);
router.post("/update-other-goods", CheckRoleAndTokenAccess, UpdateOtherGoods);
router.post("/list-other-goods", CheckRoleAndTokenAccess, FetchOtherGoods);
router.post(
  "/list-other-goods-consumed",
  CheckRoleAndTokenAccess,
  FetchOtherGoodsConsumption
);
router.get("/othergood-logs", ListOtherGoodsLogs);
router.get("/othergoodconsumed-logs", ListOtherGoodsConsumedLogs);

export default router;
