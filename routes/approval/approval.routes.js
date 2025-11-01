import express from 'express';
import logApprovalRouter from '../inventory/log/logApproval.routes.js';
import flitchApprovalRouter from '../inventory/flitch/flitchApproval.routes.js';
import plywoodApprovalRouter from '../inventory/plywood/plywoodApproval.routes.js';
import veneerApprovalRouter from '../inventory/veener/veneerApproval.routes.js';
import mdfApprovalRouter from '../inventory/mdf/mdfApproval.routes.js';
import faceApprovalRouter from '../inventory/face/faceApproval.routes.js';
import coreApprovalRouter from '../inventory/core/coreApproval.routes.js';
import fleeceApprovalRouter from '../inventory/fleece/fleeceApproval.routes.js';
import otherGoodsApprovalRouter from '../inventory/otherGoods/otherGoodsApproval.routes.js';
import crossCutApprovalRouter from '../factory/crossCutting/crossCuttingApproval.routes.js';
import flitchingApprovalRouter from '../factory/flitching/flitchingApproval.routes.js';
import approval_raw_order_router from '../order/raw_order/approval.raw_order.routes.js';
const approvalRouters = express.Router();

approvalRouters.use('/approval', [
  logApprovalRouter,
  flitchApprovalRouter,
  plywoodApprovalRouter,
  veneerApprovalRouter,
  mdfApprovalRouter,
  faceApprovalRouter,
  coreApprovalRouter,
  fleeceApprovalRouter,
  otherGoodsApprovalRouter,
  //factory
  crossCutApprovalRouter,
  flitchingApprovalRouter,

  //order
  approval_raw_order_router
]);
// approvalRouters.use(logApprovalRouter);
// approvalRouters.use(flitchApprovalRouter);
// approvalRouters.use(plywoodApprovalRouter);
// approvalRouters.use(veneerApprovalRouter);
// approvalRouters.use(mdfApprovalRouter);
// approvalRouters.use(faceApprovalRouter);
// approvalRouters.use(coreApprovalRouter);
// approvalRouters.use(fleeceApprovalRouter);
// approvalRouters.use(otherGoodsApprovalRouter);

// // factory routes
// approvalRouters.use(crossCutApprovalRouter);
// approvalRouters.use(flitchingApprovalRouter);

export default approvalRouters;
