import express from 'express';
import logExpenseRouter from './logExpense.routes.js';
import flitchExpenseRouter from './flitchExpense.routes.js';
import faceExpenseRouter from './faceExpense.routes.js';
import coreExpenseRouter from './coreExpense.routes.js';
import plywoodExpenseRouter from './plywoodExpense.routes.js';
import veneerExpenseRouter from './veneerExpense.routes.js';
import mdfExpenseRouter from './mdfExpense.routes.js';
import fleeceExpenseRouter from './fleeceExpense.routes.js';
import otherGoodsExpenseRouter from './otherGoodsExpense.routes.js';
const expenseRouter = express.Router();

expenseRouter.use(logExpenseRouter);
expenseRouter.use(flitchExpenseRouter);
expenseRouter.use(faceExpenseRouter);
expenseRouter.use(coreExpenseRouter);
expenseRouter.use(plywoodExpenseRouter);
expenseRouter.use(veneerExpenseRouter);
expenseRouter.use(mdfExpenseRouter);
expenseRouter.use(fleeceExpenseRouter);
expenseRouter.use(otherGoodsExpenseRouter);

export default expenseRouter;
