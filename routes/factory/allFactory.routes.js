import express from 'express';
import crossCuttingFactoryRoutes from './crossCutting/crossCutting.routes.js';
import flitchingFactoryRoutes from './flitching/flitching.routes.js';
import rejected_crosscutting_router from './crossCutting/rejectedCrosscutting.routes.js';

import slicingDoneRouter from './slicing/slicing_done/slicing_done.routes.js';
import peelingDoneRouter from './peeling/peeling_done/peeling_done.routes.js';
import issueForPeelingRouter from './peeling/issue_for_peeling/issue_for_peeling.routes.js';
import issue_for_peeling_wastage_router from './peeling/issue_for_peeling/issue_for_peeling_wastage.routes.js';
import issue_for_peeling_available from './peeling/issue_for_peeling/issue_for_peeling_available.routes.js';
import issue_for_slicing_available_router from './slicing/issue_for_slicing/issue_for_slicing_available.routes.js';
import issueForSlicingRouter from './slicing/issue_for_slicing/issue_for_slicing.routes.js';
import issueForDressingRouter from './dressing/issue_for_dressing/issue_for_dressing.routes.js';
import issueForSmokingDyingRouter from './smoking_dying/issues_for_smoking_dying.routes.js';
import smokingDyingDoneRouter from './smoking_dying/smoking_dying_done.routes.js';
import dressingDoneRouter from './dressing/dressing_done/dressing.done.routes.js';
import issue_for_slicing_wastage_router from './slicing/issue_for_slicing/issue_for_slicing_wastage.routes.js';
import issueForGroupingRouter from './grouping/issues_for_grouping.routes.js';
import groupingDoneRouter from './grouping/grouping_done.routes.js';
import issue_for_tapping_router from './tapping/issue_for_tapping/issue_for_tapping.routes.js';
import tapping_done_router from './tapping/tapping_done/tapping_done.routes.js';
const factoryRouter = express.Router();

factoryRouter.use(`/factory/cross-cutting`, crossCuttingFactoryRoutes);
factoryRouter.use(
  `/factory/rejected-crosscutting`,
  rejected_crosscutting_router
);
factoryRouter.use(`/factory/flitching`, flitchingFactoryRoutes);

//peeling factory routes
factoryRouter.use(`/factory/peeling`, issueForPeelingRouter);
factoryRouter.use(`/factory/peeling-wastage`, issue_for_peeling_wastage_router);
factoryRouter.use(`/factory/peeling-available`, issue_for_peeling_available);
factoryRouter.use(`/factory/peeling-done`, peelingDoneRouter);

//slicing factory routes
factoryRouter.use(`/factory/slicing`, issueForSlicingRouter);
factoryRouter.use(`/factory/slicing-done`, slicingDoneRouter);
factoryRouter.use(
  '/factory/slicing-available',
  issue_for_slicing_available_router
);
factoryRouter.use('/factory/slicing-wastage', issue_for_slicing_wastage_router);

//Smoking-Dying routes
factoryRouter.use('/factory/smoking-dying', issueForSmokingDyingRouter);
factoryRouter.use('/factory/smoking-dying-done', smokingDyingDoneRouter);

//dressing routes
factoryRouter.use('/factory/dressing', issueForDressingRouter);
factoryRouter.use('/factory/dressing-done', dressingDoneRouter);

//grouping
factoryRouter.use('/factory/grouping', issueForGroupingRouter);
factoryRouter.use('/factory/grouping-done', groupingDoneRouter);

//tapping
factoryRouter.use('/factory/tapping', issue_for_tapping_router);
factoryRouter.use('/factory/tapping-done', tapping_done_router);

export default factoryRouter;
