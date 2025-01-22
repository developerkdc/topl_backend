import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addCustomer,
  dropdownCustomer,
  editCustomer,
  fetchCustomerList,
  fetchSingleCustomer,
} from '../../../controllers/masters/Customers/customers.controller.js';
const customerRouter = express.Router();

customerRouter.post('/add-customer', AuthMiddleware, addCustomer);
customerRouter.patch('/update-customer/:id', AuthMiddleware, editCustomer);

customerRouter.get('/single-customer/:id', AuthMiddleware, fetchSingleCustomer);
customerRouter.post('/list-customer', AuthMiddleware, fetchCustomerList);

customerRouter.get('/dropdown-customer', AuthMiddleware, dropdownCustomer);

export default customerRouter;
