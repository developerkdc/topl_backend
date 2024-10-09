import express from "express";
import logExpenseRouter from "./logExpense.routes.js";
const expenseRouter = express.Router();

expenseRouter.use(logExpenseRouter)

export default expenseRouter;