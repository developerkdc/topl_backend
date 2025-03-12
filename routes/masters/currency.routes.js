import express from 'express';
import {
  AddCurrencyMaster,
  DropdownCurrencyMaster,
  ListCurrencyMaster,
  UpdateCurrencyMaster,
} from '../../controllers/masters/currency.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';
// import { ListCurrencyLogs } from "../../controllers/logs/Masters/CurrencyLogs.js";

const router = express.Router();

router.post(
  '/add-currency-master',
  AuthMiddleware,
  RolesPermissions('currency_master', 'create'),
  AddCurrencyMaster
);
router.post(
  '/update-currency-master',
  AuthMiddleware,
  RolesPermissions('currency_master', 'edit'),
  UpdateCurrencyMaster
);
router.post(
  '/list-currency-master',
  AuthMiddleware,
  RolesPermissions('currency_master', 'view'),
  ListCurrencyMaster
);
// router.get("/currency-logs", ListCurrencyLogs);

// without permission
router.get('/dropdown-currency-master', AuthMiddleware, DropdownCurrencyMaster);

export default router;
