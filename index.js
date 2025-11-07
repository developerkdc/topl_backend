import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import http from 'http';
import path, { dirname } from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import getConfigs from './config/config.js';
import mongo_service from './database/mongo.service.js';
import approvalRouters from './routes/approval/approval.routes.js';
import approvalConfigRouter from './routes/approvalConfig/approvalConfig.routes.js';
import authRouter from './routes/auth.routes.js';
import factoryRouter from './routes/factory/allFactory.routes.js';
import allInventoryRouter from './routes/inventory/allInventoryRouter.routes.js';
import allMasterRouter from './routes/masters/allMaster.routes.js';
import profileRouter from './routes/profile.routes.js';
import rolesRouter from './routes/roles.routes.js';
import allSeriesProductMasterRouter from './routes/seriesProductMaster/allSeriesProductMaster.routes.js';
import usersRouter from './routes/users.routes.js';
import allOrderRouter from './routes/order/allOrder.routes.js';
import { globalErrorHandler } from './utils/errors/GlobalErrorHandler.js';
import { checkServerHealth, fetchDBConnections } from './controllers/auth.js';
// import { start_worker_thread } from './utils/constants.js';
import { insert_raw_machine_data_into_machine_mismatch_model } from './utils/workers/workers.js';
import mongoose from 'mongoose';
import all_challan_router from './routes/challan/all_challan.routes.js';
import allPackingRoutes from './routes/packing/all_packing.routes.js';
import dispatchRouter from './routes/dispatch/dispatch.routes.js';
import { handle_photo_master_streams } from './controllers/masters/Photo/photo.controller.js';
// import { start_worker_thread } from './utils/constants.js';

const Configs = getConfigs();
mongo_service();

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: Configs?.cors?.origin,
    methods: ['GET', 'POST'],
  },
});

const PORT = Configs.server.port;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.json({ limit: 'Infinity' }));
app.use(express.urlencoded({ limit: 'Infinity', extended: true }));

global.config = {
  dirname: __dirname,
  filename: __filename,
};

//start worker thread for dressing missmatch data
// start_worker_thread();
insert_raw_machine_data_into_machine_mismatch_model();

//handler to handle photo updates 
handle_photo_master_streams();

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
app.use('/server-health', checkServerHealth);
app.use('/check-db-connections', fetchDBConnections);
//master
app.use(`/api/${Configs.server.version}`, allMasterRouter);
//Series Product Master
app.use(`/api/${Configs.server.version}`, allSeriesProductMasterRouter);
// inventory
app.use(`/api/${Configs.server.version}`, allInventoryRouter);
//factory - routes
app.use(`/api/${Configs.server.version}`, factoryRouter);
//Approval
app.use(`/api/${Configs.server.version}`, approvalRouters);
// orders
app.use(`/api/${Configs.server.version}/order`, allOrderRouter);
//challan routes
app.use(`/api/${Configs.server.version}/challan`, all_challan_router);
// Packing routes
app.use(`/api/${Configs.server.version}/packing`, allPackingRoutes);
//Dispatch
app.use(`/api/${Configs.server.version}/dispatch`, dispatchRouter);

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
