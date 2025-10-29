import express from 'express';
import currencyMasterRouter from './currency.routes.js';
import cutMasterRouter from './cut.routes.js';
import departmentRouter from './department.routes.js';
import expenseRouter from './Expenses/index.js';
import expenseTypeMasterRouter from './expenseType.routes.js';
import gradeMasterRouter from './grade.routes.js';
import gstMasterRouter from './gst.routes.js';
import itemCategoryRouter from './item.cateory.routes.js';
import itemSubCategoryRouter from './item.subcategory.routes.js';
import itemNameMasterRouter from './itemName.routes.js';
import machineRouter from './machine.routes.js';
import seriesRouter from './series.routes.js';
import supplierMasterRouter from './supplier.routes.js';
import unitMasterRouter from './unit.routes.js';
import characterRouter from './Character/character.routes.js';
import polishRouter from './Polish/polish.routes.js';
import patternRouter from './Pattern/pattern.routes.js';
import processRouter from './Process/process.routes.js';
import colorRouter from './Color/color.routes.js';
import vehicleRouter from './Vehicle/vehicle.routes.js';
import transporterRouter from './Transporter/transporter.routes.js';
import dispatchAddressRouter from './DispatchAddress/dispatchAddress.routes.js';
import photoRouter from './Photo/photo.routes.js';
import customerRouter from './Customers/customers.routes.js';
import customerClientRouter from './Customers/CustomerClients/customerClients.routes.js';
import sizeRouter from './Size/size.routes.js';
import salesItemNameRouter from './SalesItemName/salesItemName.routes.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import { bulk_upload_masters } from '../../controllers/bulk_uploads/masters/masters_bulk_upload.controller.js';

const allMasterRouter = express.Router();

allMasterRouter.use(`/supplier-master`, supplierMasterRouter);
allMasterRouter.use(`/item-category`, itemCategoryRouter);
allMasterRouter.use(`/item-subcategory`, itemSubCategoryRouter);
allMasterRouter.use(`/unit-master`, unitMasterRouter);
allMasterRouter.use(`/grade-master`, gradeMasterRouter);
allMasterRouter.use(`/currency-master`, currencyMasterRouter);
allMasterRouter.use(`/cut-master`, cutMasterRouter);
allMasterRouter.use(`/gst-master`, gstMasterRouter);
allMasterRouter.use(`/expenseType-master`, expenseTypeMasterRouter);
allMasterRouter.use(`/expense-master`, expenseRouter);
allMasterRouter.use(`/item-name-master`, itemNameMasterRouter);
allMasterRouter.use(`/department-master`, departmentRouter);
allMasterRouter.use(`/machine-master`, machineRouter);
allMasterRouter.use(`/series-master`, seriesRouter);

allMasterRouter.use(`/character-master`, characterRouter);
allMasterRouter.use(`/pattern-master`, patternRouter);
allMasterRouter.use(`/process-master`, processRouter);
allMasterRouter.use(`/color-master`, colorRouter);
allMasterRouter.use(`/vehicle-master`, vehicleRouter);
allMasterRouter.use(`/transporter-master`, transporterRouter);
allMasterRouter.use(`/dispatchAddress-master`, dispatchAddressRouter);
allMasterRouter.use(`/photo-master`, photoRouter);
allMasterRouter.use(`/salesItemName-master`, salesItemNameRouter);
allMasterRouter.use(`/customer-master`, [customerRouter, customerClientRouter]);
allMasterRouter.use(`/polish-master`, polishRouter);
allMasterRouter.use(`/size-master`, sizeRouter);

//masters bulk upload routes
allMasterRouter.use('/masters/bulk-upload', AuthMiddleware, bulk_upload_masters)

export default allMasterRouter;
