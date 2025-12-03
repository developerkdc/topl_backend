import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addCustomer,
  dropdownCustomer,
  editCustomer,
  fetch_single_customer_by_id,
  fetchCustomerList,
  fetchSingleCustomer,
  verify_customer_gstin,
} from '../../../controllers/masters/Customers/customers.controller.js';
import EInvoiceAuthMiddleware from '../../../middlewares/eInvoiceAuth.middleware.js';
const customerRouter = express.Router();

customerRouter.post('/add-customer', AuthMiddleware, addCustomer);
customerRouter.patch('/update-customer/:id', AuthMiddleware, editCustomer);

customerRouter.get('/single-customer/:id', AuthMiddleware, fetchSingleCustomer);
customerRouter.post('/list-customer', AuthMiddleware, fetchCustomerList);

customerRouter.get('/dropdown-customer', AuthMiddleware, dropdownCustomer);

//gst related apis
customerRouter.get('/verify-customer-gstin', AuthMiddleware, EInvoiceAuthMiddleware, verify_customer_gstin);

//mobile API's
customerRouter.post('/fetch-single-customer-by-id', fetch_single_customer_by_id);

export default customerRouter;
