import express from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { AddCurrencyMaster, DropdownCurrencyMaster, ListCurrencyMaster, UpdateCurrencyMaster } from "../../controllers/masters/currency.js";
// import { ListCurrencyLogs } from "../../controllers/logs/Masters/CurrencyLogs.js";

const router = express.Router();

router.post("/add-currency-master", CheckRoleAndTokenAccess, AddCurrencyMaster);
router.post("/update-currency-master", CheckRoleAndTokenAccess, UpdateCurrencyMaster);
router.post("/list-currency-master", CheckRoleAndTokenAccess, ListCurrencyMaster);
// router.get("/currency-logs", ListCurrencyLogs);
router.get("/dropdown-currency-master", DropdownCurrencyMaster);

export default router;
