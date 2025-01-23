import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addPattern,
  dropdownPattern,
  fetchPatternList,
  fetchSinglePattern,
  updatePattern,
} from '../../../controllers/masters/Pattern/pattern.controller.js';

const patternRouter = express.Router();

patternRouter.post('/add-pattern', AuthMiddleware, addPattern);
patternRouter.patch('/update-pattern/:id', AuthMiddleware, updatePattern);

patternRouter.get('/single-pattern/:id', AuthMiddleware, fetchSinglePattern);
patternRouter.post('/list-pattern', AuthMiddleware, fetchPatternList);

patternRouter.get('/dropdown-pattern', AuthMiddleware, dropdownPattern);

export default patternRouter;
