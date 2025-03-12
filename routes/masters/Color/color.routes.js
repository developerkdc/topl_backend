import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addColor,
  dropdownColor,
  fetchColorList,
  fetchSingleColor,
  updateColor,
} from '../../../controllers/masters/Color/color.controller.js';

const colorRouter = express.Router();

colorRouter.post('/add-color', AuthMiddleware, addColor);
colorRouter.patch('/update-color/:id', AuthMiddleware, updateColor);

colorRouter.get('/single-color/:id', AuthMiddleware, fetchSingleColor);
colorRouter.post('/list-color', AuthMiddleware, fetchColorList);

colorRouter.get('/dropdown-color', AuthMiddleware, dropdownColor);

export default colorRouter;
