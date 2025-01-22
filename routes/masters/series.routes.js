import { Router } from 'express';
import {
  addSeries,
  DropdownSeriesNameMaster,
  editSeries,
  listSeriesDetails,
} from '../../controllers/masters/series.controller.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import RolesPermissions from '../../middlewares/permission.js';

const router = Router();

router.post(
  '/add-series',
  AuthMiddleware,
  RolesPermissions('series_master', 'create'),
  addSeries
);
router.post(
  '/update-series/:id',
  AuthMiddleware,
  RolesPermissions('series_master', 'edit'),
  editSeries
);
router.post(
  '/list-series',
  AuthMiddleware,
  RolesPermissions('series_master', 'view'),
  listSeriesDetails
);

// without permission
router.get('/dropdown-series-master', AuthMiddleware, DropdownSeriesNameMaster);
export default router;
