import express from "express";
import logExpenseRouter from "./logExpense.routes.js";
import flitchExpenseRouter from "./flitchExpense.routes.js";
const expenseRouter = express.Router();

expenseRouter.use(logExpenseRouter)
expenseRouter.use(flitchExpenseRouter)

export default expenseRouter;