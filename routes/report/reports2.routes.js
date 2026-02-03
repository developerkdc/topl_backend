import { CrossCuttingDailyReportExcel } from '../../controllers/reports2/crossCutting.js';
import logRoutes from './reports2/Log/log.routes.js';
import flitchRoutes from './reports2/Flitch/flitch.routes.js';
import slicingRoutes from './reports2/Slicing/slicing.route.js';
import express from 'express';

const router = express.Router();

//crosscutting
router.post('/download-excel-crosscutting-daily-report', CrossCuttingDailyReportExcel);

//log routes (Log Inward & Item Wise Inward)
router.use(logRoutes);

//flitch routes (Flitch Daily Report)
router.use(flitchRoutes);

//slicing routes (Slicing Daily Report)
router.use(slicingRoutes);

export default router;
