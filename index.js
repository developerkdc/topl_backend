import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongo_service from "./database/mongo.service.js";
import getConfigs from "./config/config.js";
import authRouter from "./routes/auth.routes.js";
import usersRouter from "./routes/users.routes.js";
import rolesRouter from "./routes/roles.routes.js";
import profileRouter from "./routes/profile.routes.js";
import supplierMasterRouter from "./routes/masters/supplier.routes.js";
import unitMasterRouter from "./routes/masters/unit.routes.js";
import gradeMasterRouter from "./routes/masters/grade.routes.js";
import palleteMasterRouter from "./routes/masters/pallete.routes.js";
import partyNameMasterRouter from "./routes/masters/partyName.routes.js";
import itemNameMasterRouter from "./routes/masters/itemName.routes.js";
import itemCodeMasterRouter from "./routes/masters/itemCode.routes.js";
import otherGoodsInventoryRouter from "./routes/inventory/otherGoods/otherGoods.routes.js";
import rawMaterialInventoryRouter from "./routes/inventory/raw/raw.routes.js";
import groupingRouter from "./routes/group/group.routes.js";
import smokingRouter from "./routes/smoking/smoking.routes.js";
import dyingRouter from "./routes/dying/dying.routes.js";
import cuttingRouter from "./routes/cutting/cutting.routes.js";
import tapingRouter from "./routes/taping/taping.routes.js";
import pressingRouter from "./routes/pressing/pressing.routes.js";
import finishingRouter from "./routes/finishing/finishing.routes.js";
import orderRouter from "./routes/order/order.routes.js";
import dispatchRouter from "./routes/dispatch/dispatch.routes.js";
import readySheetRouter from "./routes/readySheetForm/readySheet.routes.js";
import readyInventoryRouter from "./routes/inventory/readyForDispatch/readyForDispatch.routes.js";
import imagesRouter from "./routes/image/image.routes.js";
import reportRouter from "./routes/report/report.routes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import path from "path";

import { globalErrorHandler } from "./utils/errors/GlobalErrorHandler.js";
const Configs = getConfigs();
mongo_service();
const app = express();
const server = http.createServer(app);
const PORT = Configs.server.port;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.json());

var corsOptions = {
  origin: Configs.cors.origin,
  optionsSuccessStatus: 200,
  credentials: Configs.cors.credentials,
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use("/upload", express.static("./upload"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.static(__dirname));
app.use(cookieParser());

app.use(`/api/${Configs.server.version}/auth`, authRouter);
app.use(`/api/${Configs.server.version}/user`, usersRouter);
app.use(`/api/${Configs.server.version}/role`, rolesRouter);
app.use(`/api/${Configs.server.version}/profile`, profileRouter);

//master
app.use(`/api/${Configs.server.version}/supplier-master`, supplierMasterRouter);
app.use(`/api/${Configs.server.version}/unit-master`, unitMasterRouter);
app.use(`/api/${Configs.server.version}/grade-master`, gradeMasterRouter);
app.use(`/api/${Configs.server.version}/pallete-master`, palleteMasterRouter);
app.use(
  `/api/${Configs.server.version}/party-name-master`,
  partyNameMasterRouter
);
app.use(
  `/api/${Configs.server.version}/item-name-master`,
  itemNameMasterRouter
);
app.use(
  `/api/${Configs.server.version}/item-code-master`,
  itemCodeMasterRouter
);

// inventory
app.use(
  `/api/${Configs.server.version}/other-goods-inventory`,
  otherGoodsInventoryRouter
);
app.use(
  `/api/${Configs.server.version}/raw-material-inventory`,
  rawMaterialInventoryRouter
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

app.use(globalErrorHandler);
// Error handling for the server
server.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
