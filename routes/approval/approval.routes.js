import express from "express";
import logApprovalRouter from "../inventory/log/logApproval.routes.js";
const approvalRouters = express.Router();

approvalRouters.use(logApprovalRouter);

export default approvalRouters;