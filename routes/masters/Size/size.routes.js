import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addLength,
  dropdownLength,
  fetchLengthList,
  fetchSingleLength,
  updateLength,
} from '../../../controllers/masters/Size/length.controller.js';
import {
  addWidth,
  dropdownWidth,
  fetchSingleWidth,
  fetchWidthList,
  updateWidth,
} from '../../../controllers/masters/Size/width.controller.js';
import {
  addThickness,
  dropdownThickness,
  fetchSingleThickness,
  fetchThicknessList,
  updateThickness,
} from '../../../controllers/masters/Size/thickness.controller.js';

const sizeRouter = express.Router();

sizeRouter.post('/add-length', AuthMiddleware, addLength);
sizeRouter.patch('/update-length/:id', AuthMiddleware, updateLength);
sizeRouter.get('/single-length/:id', AuthMiddleware, fetchSingleLength);
sizeRouter.post('/list-length', AuthMiddleware, fetchLengthList);

sizeRouter.post('/add-width', AuthMiddleware, addWidth);
sizeRouter.patch('/update-width/:id', AuthMiddleware, updateWidth);
sizeRouter.get('/single-width/:id', AuthMiddleware, fetchSingleWidth);
sizeRouter.post('/list-width', AuthMiddleware, fetchWidthList);

sizeRouter.post('/add-thickness', AuthMiddleware, addThickness);
sizeRouter.patch('/update-thickness/:id', AuthMiddleware, updateThickness);
sizeRouter.get('/single-thickness/:id', AuthMiddleware, fetchSingleThickness);
sizeRouter.post('/list-thickness', AuthMiddleware, fetchThicknessList);

sizeRouter.get('/dropdown-length', AuthMiddleware, dropdownLength);
sizeRouter.get('/dropdown-width', AuthMiddleware, dropdownWidth);
sizeRouter.get('/dropdown-thickness', AuthMiddleware, dropdownThickness);

export default sizeRouter;
