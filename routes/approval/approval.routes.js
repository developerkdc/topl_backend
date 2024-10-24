import express from "express";
import logApprovalRouter from "../inventory/log/logApproval.routes.js";
import flitchApprovalRouter from "../inventory/flitch/flitchApproval.routes.js";
import plywoodApprovalRouter from "../inventory/plywood/plywoodApproval.routes.js";
import veneerApprovalRouter from "../inventory/veener/veneerApproval.routes.js";
import mdfApprovalRouter from "../inventory/mdf/mdfApproval.routes.js";
import faceApprovalRouter from "../inventory/face/faceApproval.routes.js";
import coreApprovalRouter from "../inventory/core/coreApproval.routes.js";
import fleeceApprovalRouter from "../inventory/fleece/fleeceApproval.routes.js";
const approvalRouters = express.Router();

approvalRouters.use(logApprovalRouter);
approvalRouters.use(flitchApprovalRouter);
approvalRouters.use(plywoodApprovalRouter);
approvalRouters.use(veneerApprovalRouter);
approvalRouters.use(mdfApprovalRouter);
approvalRouters.use(faceApprovalRouter);
approvalRouters.use(coreApprovalRouter);
approvalRouters.use(fleeceApprovalRouter);

export default approvalRouters;