import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongo_service from './database/mongo.service.js';
import getConfigs from './config/config.js';
import authRouter from './routes/auth.routes.js';
import usersRouter from './routes/users.routes.js';
import rolesRouter from './routes/roles.routes.js';
import profileRouter from './routes/profile.routes.js';
import approvalConfigRouter from './routes/approvalConfig/approvalConfig.routes.js';
import supplierMasterRouter from './routes/masters/supplier.routes.js';
import unitMasterRouter from './routes/masters/unit.routes.js';
import gradeMasterRouter from './routes/masters/grade.routes.js';
import currencyMasterRouter from './routes/masters/currency.routes.js';
import cutMasterRouter from './routes/masters/cut.routes.js';
import gstMasterRouter from './routes/masters/gst.routes.js';
import expenseTypeMasterRouter from './routes/masters/expenseType.routes.js';
import palleteMasterRouter from './routes/masters/pallete.routes.js';
import partyNameMasterRouter from './routes/masters/partyName.routes.js';
import itemNameMasterRouter from './routes/masters/itemName.routes.js';
import itemCodeMasterRouter from './routes/masters/itemCode.routes.js';
import otherGoodsInventoryRouter from './routes/inventory/otherGoods/otherGoods.routes.js';
import rawMaterialInventoryRouter from './routes/inventory/raw/raw.routes.js';
import groupingRouter from './routes/group/group.routes.js';
import smokingRouter from './routes/smoking/smoking.routes.js';
import dyingRouter from './routes/dying/dying.routes.js';
import cuttingRouter from './routes/cutting/cutting.routes.js';
import tapingRouter from './routes/taping/taping.routes.js';
import pressingRouter from './routes/pressing/pressing.routes.js';
import finishingRouter from './routes/finishing/finishing.routes.js';
import orderRouter from './routes/order/order.routes.js';
import dispatchRouter from './routes/dispatch/dispatch.routes.js';
import readySheetRouter from './routes/readySheetForm/readySheet.routes.js';
import readyInventoryRouter from './routes/inventory/readyForDispatch/readyForDispatch.routes.js';
import imagesRouter from './routes/image/image.routes.js';
import reportRouter from './routes/report/report.routes.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import itemCategoryRouter from './routes/masters/item.cateory.routes.js';
import itemSubCategoryRouter from './routes/masters/item.subcategory.routes.js';
import departmentRouter from './routes/masters/department.routes.js';
import machineRouter from './routes/masters/machine.routes.js';
import seriesRouter from './routes/masters/series.routes.js';
import plywoodInventoryRoutes from './routes/inventory/plywood/plywood.routes.js';
import mdfInventoryRoutes from './routes/inventory/mdf/mdf.routes.js';
import faceInventoryRoutes from './routes/inventory/face/face.routes.js';
import coreInventoryRoutes from './routes/inventory/core/core.routes.js';
import crossCuttingFactoryRoutes from './routes/factory/crossCutting/crossCutting.routes.js';
import flitchingFactoryRoutes from './routes/factory/flitching/flitching.routes.js';
import logRouter from './routes/inventory/log/log.routes.js';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

import { globalErrorHandler } from './utils/errors/GlobalErrorHandler.js';
import flitch_router from './routes/inventory/flitch/flitch.routes.js';
import veneer_router from './routes/inventory/veener/venner.routes.js';
import fleece_router from './routes/inventory/fleece/fleece.routes.js';
import rejected_crosscutting_router from './routes/factory/crossCutting/rejectedCrosscutting.routes.js';
import expenseRouter from './routes/masters/Expenses/index.js';
import { error } from 'console';
import approvalRouters from './routes/approval/approval.routes.js';
import allMasterRouter from './routes/masters/allMaster.routes.js';
import barcodeRouter from './routes/seriesProductMaster/barcode.routes.js';
import bunitoRouter from './routes/seriesProductMaster/bunito.routes.js';
import mattleRouter from './routes/seriesProductMaster/mattle.routes.js';
import novelRouter from './routes/seriesProductMaster/novel.routes.js';
import marvelRouter from './routes/seriesProductMaster/marvel.routes.js';
import regantoClassicRouter from './routes/seriesProductMaster/reganto.classic.routes.js';
import regantoPremierRouter from './routes/seriesProductMaster/reganto.premier.routes.js';
import furrowRouter from './routes/seriesProductMaster/furrow.routes.js';
import chromaCollectionRouter from './routes/seriesProductMaster/chromaCollection.routes.js';
import chromaRibbedRouter from './routes/seriesProductMaster/chromaRibbed.routes.js';
import chromaCompositeRouter from './routes/seriesProductMaster/chromaComposite.routes.js';
import canvasRouter from './routes/seriesProductMaster/canvas.routes.js';
import regantoDezinerRouter from './routes/seriesProductMaster/regantoDeziner.routes.js';
import furrowLiteRouter from './routes/seriesProductMaster/furrow.lite.routes.js';
import furrowRegantoRouter from './routes/seriesProductMaster/furrow.reganto.routes.js';
import accoRouter from './routes/seriesProductMaster/acco.routes.js';
import factoryRouter from './routes/factory/allFactory.routes.js';
const Configs = getConfigs();
mongo_service();
const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://topl.kdcstaging.in',
    ], // Adjust according to your needs (e.g., "http://localhost:3000")
    methods: ['GET', 'POST'],
  },
});
const PORT = Configs.server.port;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.json({ limit: 'Infinity' }));
app.use(express.urlencoded({ limit: 'Infinity', extended: true }));

var corsOptions = {
  origin: Configs.cors.origin,
  optionsSuccessStatus: 200,
  credentials: Configs.cors.credentials,
};
app.use(cors(corsOptions));
app.use('/upload', express.static('./upload'));
app.use(express.static('./format'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.use(cookieParser());

app.use(`/api/${Configs.server.version}/auth`, authRouter);
app.use(`/api/${Configs.server.version}/user`, usersRouter);
app.use(`/api/${Configs.server.version}/role`, rolesRouter);
app.use(`/api/${Configs.server.version}/profile`, profileRouter);
app.use(`/api/${Configs.server.version}/approval-config`, approvalConfigRouter);

//master
// app.use(`/api/${Configs.server.version}/supplier-master`, supplierMasterRouter);
// app.use(`/api/${Configs.server.version}/item-category`, itemCategoryRouter);
// app.use(
//   `/api/${Configs.server.version}/item-subcategory`,
//   itemSubCategoryRouter
// );
// app.use(`/api/${Configs.server.version}/unit-master`, unitMasterRouter);
// app.use(`/api/${Configs.server.version}/grade-master`, gradeMasterRouter);
// app.use(`/api/${Configs.server.version}/currency-master`, currencyMasterRouter);
// app.use(`/api/${Configs.server.version}/cut-master`, cutMasterRouter);
// app.use(`/api/${Configs.server.version}/gst-master`, gstMasterRouter);
// app.use(
//   `/api/${Configs.server.version}/expenseType-master`,
//   expenseTypeMasterRouter
// );
// app.use(
//   `/api/${Configs.server.version}/expense-master`,
//   expenseRouter
// );
// // app.use(`/api/${Configs.server.version}/pallete-master`, palleteMasterRouter);
// // app.use(
// //   `/api/${Configs.server.version}/party-name-master`,
// //   partyNameMasterRouter
// // );
// app.use(
//   `/api/${Configs.server.version}/item-name-master`,
//   itemNameMasterRouter
// );
// // app.use(
// //   `/api/${Configs.server.version}/item-code-master`,
// //   itemCodeMasterRouter
// // );
// app.use(`/api/${Configs.server.version}/department-master`, departmentRouter);
// app.use(`/api/${Configs.server.version}/machine-master`, machineRouter);
// app.use(`/api/${Configs.server.version}/series-master`, seriesRouter);

app.use(`/api/${Configs.server.version}`, allMasterRouter);

// inventory
app.use(`/api/${Configs.server.version}/log-inventory`, logRouter);
app.use(`/api/${Configs.server.version}/flitch-inventory`, flitch_router);
app.use(
  `/api/${Configs.server.version}/other-goods-inventory`,
  otherGoodsInventoryRouter
);
// app.use(
//   `/api/${Configs.server.version}/raw-material-inventory`,
//   rawMaterialInventoryRouter
// );

app.use(
  `/api/${Configs.server.version}/plywood-inventory`,
  plywoodInventoryRoutes
);
app.use(`/api/${Configs.server.version}/mdf-inventory`, mdfInventoryRoutes);
app.use(`/api/${Configs.server.version}/veneer-inventory`, veneer_router);
app.use(`/api/${Configs.server.version}/face-inventory`, faceInventoryRoutes);
app.use(`/api/${Configs.server.version}/core-inventory`, coreInventoryRoutes);
app.use(`/api/${Configs.server.version}/fleece-inventory`, fleece_router);

//factory - routes
app.use(
  `/api/${Configs.server.version}/factory/cross-cutting`,
  crossCuttingFactoryRoutes
);
app.use(
  `/api/${Configs.server.version}/factory/rejected-crosscutting`,
  rejected_crosscutting_router
);
app.use(
  `/api/${Configs.server.version}/factory/flitching`,
  flitchingFactoryRoutes
);

// Grouping
app.use(`/api/${Configs.server.version}/grouping`, groupingRouter);

// Smoking
app.use(`/api/${Configs.server.version}/smoking`, smokingRouter);

// Dying
app.use(`/api/${Configs.server.version}/dying`, dyingRouter);

// Cutting
app.use(`/api/${Configs.server.version}/cutting`, cuttingRouter);

//Taping
app.use(`/api/${Configs.server.version}/tapping`, tapingRouter);

//ready sheet routes
app.use(`/api/${Configs.server.version}/ready-sheet-form`, readySheetRouter);

//pressing routes
app.use(`/api/${Configs.server.version}/pressing`, pressingRouter);

//finishing routes
app.use(`/api/${Configs.server.version}/finishing`, finishingRouter);

//finishing routes
app.use(
  `/api/${Configs.server.version}/ready-for-dispatch-inventory`,
  readyInventoryRouter
);

//Order routes
app.use(`/api/${Configs.server.version}/order`, orderRouter);

//Dispatch routes
app.use(`/api/${Configs.server.version}/dispatch`, dispatchRouter);

// images
app.use(`/api/${Configs.server.version}/image`, imagesRouter);

// report
app.use(`/api/${Configs.server.version}/report`, reportRouter);

//Approval
app.use(`/api/${Configs.server.version}/approval`, approvalRouters);

//Series Product Master
app.use(`/api/${Configs.server.version}/series-product-master`, [
  barcodeRouter,
  chromaCollectionRouter,
  chromaRibbedRouter,
  chromaCompositeRouter,
  canvasRouter,
  regantoDezinerRouter,
  bunitoRouter,
  mattleRouter,
  novelRouter,
  marvelRouter,
  regantoClassicRouter,
  regantoPremierRouter,
  furrowRouter,
  furrowLiteRouter,
  furrowRegantoRouter,
  accoRouter,
]);

app.use(globalErrorHandler);

// Error handling for the server
server.on('error', (error) => {
  console.error(`Server error: ${error.message}`);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
