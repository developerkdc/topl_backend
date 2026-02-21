import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addDispatchAddress,
  dropdownDispatchAddress,
  fetchDispatchAddressList,
  fetchSingleDispatchAddress,
  setPrimaryDispatchAddress,
  updateDispatchAddress,
} from '../../../controllers/masters/DispatchAddress/dispatchAddress.controller.js';

const dispatchAddressRouter = express.Router();

dispatchAddressRouter.post(
  '/add-dispatchAddress',
  AuthMiddleware,
  addDispatchAddress
);
dispatchAddressRouter.patch(
  '/update-dispatchAddress/:id',
  AuthMiddleware,
  updateDispatchAddress
);
dispatchAddressRouter.patch(
  '/set-primary-dispatchAddress/:id',
  AuthMiddleware,
  setPrimaryDispatchAddress
);

dispatchAddressRouter.get(
  '/single-dispatchAddress/:id',
  AuthMiddleware,
  fetchSingleDispatchAddress
);
dispatchAddressRouter.post(
  '/list-dispatchAddress',
  AuthMiddleware,
  fetchDispatchAddressList
);

dispatchAddressRouter.get(
  '/dropdown-dispatchAddress',
  AuthMiddleware,
  dropdownDispatchAddress
);

export default dispatchAddressRouter;
