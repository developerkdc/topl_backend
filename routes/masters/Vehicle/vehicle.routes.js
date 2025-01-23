import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addVehicle,
  dropdownVehicle,
  fetchSingleVehicle,
  fetchVehicleList,
  updateVehicle,
} from '../../../controllers/masters/Vehicle/vehicle.controller.js';

const vehicleRouter = express.Router();

vehicleRouter.post('/add-vehicle', AuthMiddleware, addVehicle);
vehicleRouter.patch('/update-vehicle/:id', AuthMiddleware, updateVehicle);

vehicleRouter.get('/single-vehicle/:id', AuthMiddleware, fetchSingleVehicle);
vehicleRouter.post('/list-vehicle', AuthMiddleware, fetchVehicleList);

vehicleRouter.get('/dropdown-vehicle', AuthMiddleware, dropdownVehicle);

export default vehicleRouter;
