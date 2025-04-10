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
import tapping_wastage_router from './tapping/tapping_wastage/tapping_wastage.routes.js';
import issue_for_issue_for_resizing_router from './plywood_resizing/issue_for_resizing/issue_for_resizing.routes.js';
import resizing_done_router from './plywood_resizing/resizing_done/resizing_done.routes.js';
import issue_for_pressing_router from './pressing/issues_for_pressing/issues_for_pressing.routes.js';
import plywoodProductionRouter from './plywood_production/plywood_production.routes.js';
import issue_for_cnc_router from './cnc/issue_for_cnc/issue_for_cnc.routes.js';
import cnc_done_router from './cnc/cnc_done/cnc_done.routes.js';
import { add_issue_for_factory_data } from '../../controllers/factory/issue_for_factory/issue_for_factory.controller.js';
import cnc_damage_router from './cnc/cnc_damage/cnc_damage.routes.js';
import { revert_issue_for_factory_data } from '../../controllers/factory/issue_for_factory/revert_issue_for_factory.controller.js';
import color_damage_router from './colour/colour_damage/colour_damage.routes.js';
import color_done_router from './colour/colour_done/colour_done.routes.js';
import issue_for_color_router from './colour/issue_for_colour/issue_for_colour.routes.js';
import canvas_damage_router from './canvas/canvas_damage/canvas_damage.routes.js';
import canvas_done_router from './canvas/canvas_done/canvas_done.routes.js';
import issue_for_canvas_router from './canvas/issue_for_canvas/issue_for_canvas.routes.js';
import issue_for_polishing_router from './polishing/issue_for_polishing/issue_for_polishing.routes.js';
import polishing_done_router from './polishing/polishing_done/polishing_done.routes.js';
import polishing_damage_router from './polishing/polishing_damage/polishing_damage.routes.js';
import bunito_damage_router from './bunito/bunito_damage/bunito_damage.routes.js';
import bunito_done_router from './bunito/bunito_done/bunito_done.routes.js';
import issue_for_bunito_router from './bunito/issue_for_bunito/issue_for_bunito.routes.js';

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
factoryRouter.use('/factory/tapping-wastage', tapping_wastage_router);

//Plywood Resizing
factoryRouter.use(
  '/factory/issue-for-resizing',
  issue_for_issue_for_resizing_router
);
factoryRouter.use('/factory/resizing-done', resizing_done_router);

//pressing
factoryRouter.use('/factory/pressing', issue_for_pressing_router);
//Plywood production
factoryRouter.use('/factory/plywood-production', plywoodProductionRouter);

//cnc
factoryRouter.use('/factory/issue-for-cnc', issue_for_cnc_router);
factoryRouter.use('/factory/cnc-done', cnc_done_router);
factoryRouter.use('/factory/cnc-damage', cnc_damage_router);
//bunito
factoryRouter.use('/factory/issue-for-bunito', issue_for_bunito_router);
factoryRouter.use('/factory/bunito-done', bunito_done_router);
factoryRouter.use('/factory/bunito-damage', bunito_damage_router);

//color
factoryRouter.use('/factory/issue-for-color', issue_for_color_router);
factoryRouter.use('/factory/color-done', color_done_router);
factoryRouter.use('/factory/color-damage', color_damage_router);

//canvas
factoryRouter.use('/factory/issue-for-canvas', issue_for_canvas_router);
factoryRouter.use('/factory/canvas-done', canvas_done_router);
factoryRouter.use('/factory/canvas-damage', canvas_damage_router);

//polishing
factoryRouter.use('/factory/issue-for-polishing', issue_for_polishing_router);
factoryRouter.use('/factory/polishing-done', polishing_done_router);
factoryRouter.use('/factory/polishing-damage', polishing_damage_router);

//route for issuing data from factory
factoryRouter.use('/issue-for-factory', add_issue_for_factory_data);
//route for reverting issued data from factory
factoryRouter.use('/issue-for-factory', revert_issue_for_factory_data);

export default factoryRouter;
