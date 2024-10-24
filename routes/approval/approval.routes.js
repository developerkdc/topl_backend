import express from "express";
import logApprovalRouter from "../inventory/log/logApproval.routes.js";
import flitchApprovalRouter from "../inventory/flitch/flitchApproval.routes.js";
import plywoodApprovalRouter from "../inventory/plywood/plywoodApproval.routes.js";
import veneerApprovalRouter from "../inventory/veener/veneerApproval.routes.js";
const approvalRouters = express.Router();

approvalRouters.use(logApprovalRouter);
approvalRouters.use(flitchApprovalRouter);
approvalRouters.use(plywoodApprovalRouter);
approvalRouters.use(veneerApprovalRouter);

export default approvalRouters;