import express from "express";
import logExpenseRouter from "./logExpense.routes.js";
import flitchExpenseRouter from "./flitchExpense.routes.js";
import faceExpenseRouter from "./faceExpense.routes.js";
const expenseRouter = express.Router();

expenseRouter.use(logExpenseRouter)
expenseRouter.use(flitchExpenseRouter)
expenseRouter.use(faceExpenseRouter)

export default expenseRouter;