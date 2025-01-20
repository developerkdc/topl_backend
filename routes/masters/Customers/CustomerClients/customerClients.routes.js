import express from "express";
import AuthMiddleware from "../../../../middlewares/verifyToken.js";
import { addCustomerClient, deleteCustomerClient, editCustomerClient, fetchCustomerClientList } from "../../../../controllers/masters/Customers/CustomerClients/customerClients.controller.js";

const customerClientRouter = express.Router();

customerClientRouter.post("/add-customer-client/:customer_id",AuthMiddleware,addCustomerClient)
customerClientRouter.patch("/update-customer-client/:id",AuthMiddleware,editCustomerClient)
customerClientRouter.delete("/delete-customer-client/:id",AuthMiddleware,deleteCustomerClient)
customerClientRouter.post("/fetch-customer-client/:customer_id",AuthMiddleware,fetchCustomerClientList)

export default customerClientRouter