import logRoutes from './reports2/Log/log.routes.js';
import crosscutRoutes from './reports2/Crosscut/crosscut.routes.js';
import flitchRoutes from './reports2/Flitch/flitch.routes.js';
import slicingRoutes from './reports2/Slicing/slicing.route.js';
import dressingRoutes from './reports2/Dressing/dressing.routes.js';
import smokingDyingRoutes from './reports2/Smoking&Dying/smoking_dying.routes.js';
import groupingSplicingRoutes from './reports2/Grouping_Splicing/grouping_splicing.routes.js';
import faceRoutes from './reports2/Face/face.routes.js';
import coreRoutes from './reports2/Core/core.routes.js';
import tappingORClippingRoutes from './reports2/TappingORClipping/TappingORClipping.js';
import express from 'express';

const router = express.Router();

// Crosscut routes (Crosscut Daily Report)
router.use(crosscutRoutes);

// Tapping/Clipping routes (Clipping Daily Report)
router.use(tappingORClippingRoutes);

//log routes (Log Inward & Item Wise Inward)
router.use(logRoutes);

//flitch routes (Flitch Daily Report)
router.use(flitchRoutes);

//slicing routes (Slicing Daily Report)
router.use(slicingRoutes);

//dressing routes (Dressing Daily Report)
router.use(dressingRoutes);

// Smoking&Dying routes (Dyeing Details Daily Report)
router.use(smokingDyingRoutes);

// Grouping_Splicing routes (Hand Splicing Daily Report)
router.use(groupingSplicingRoutes);

// Face routes (Face Stock Report)
router.use(faceRoutes);

// Core routes (Core Stock Report)
router.use(coreRoutes);

export default router;
