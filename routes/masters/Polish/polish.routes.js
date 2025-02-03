import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addPolish,
  dropdownPolish,
  fetchPolishList,
  fetchSinglePolish,
  updatePolish,
} from '../../../controllers/masters/Polish/polish.controller.js';

const polishRouter = express.Router();

polishRouter.post('/add-polish', AuthMiddleware, addPolish);
polishRouter.patch('/update-polish/:id', AuthMiddleware, updatePolish);

polishRouter.get(
  '/single-polish/:id',
  AuthMiddleware,
  fetchSinglePolish
);
polishRouter.post('/list-polish', AuthMiddleware, fetchPolishList);

polishRouter.get('/dropdown-polish', AuthMiddleware, dropdownPolish);

export default polishRouter;
