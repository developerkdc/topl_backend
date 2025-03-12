import express from 'express';
import CheckRoleAndTokenAccess from '../../middlewares/permission.js';
import {
  AvailableGroupData,
  AvailableRawData,
  CreateDispatch,
  DeleteGroupDispatch,
  DeleteRawDispatch,
  ListGroupDispatchCreated,
  ListItemPallete,
  ListRawDispatchCreated,
} from '../../controllers/dispatch/dispatch.js';
const router = express.Router();

router.post('/create-dispatch', CheckRoleAndTokenAccess, CreateDispatch);
router.post('/delete-raw-dispatch', CheckRoleAndTokenAccess, DeleteRawDispatch);
router.post(
  '/delete-group-dispatch',
  CheckRoleAndTokenAccess,
  DeleteGroupDispatch
);
router.post(
  '/list-raw-dispatched',
  CheckRoleAndTokenAccess,
  ListRawDispatchCreated
);
router.post(
  '/list-group-dispatched',
  CheckRoleAndTokenAccess,
  ListGroupDispatchCreated
);
router.post(
  '/get-available-group-data',
  CheckRoleAndTokenAccess,
  AvailableGroupData
);
router.post(
  '/get-available-raw-data',
  CheckRoleAndTokenAccess,
  AvailableRawData
);
router.get('/get-item-pallete', ListItemPallete);
export default router;
