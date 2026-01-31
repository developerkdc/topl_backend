import { CrossCuttingDailyReportExcel } from '../../controllers/reports2/crossCutting.js';
import { LogInwardDailyReportExcel } from '../../controllers/reports2/logInward.js';
import express from 'express';

const router = express.Router();

//crosscutting
router.post('/download-excel-crosscutting-daily-report', CrossCuttingDailyReportExcel);

//log inward
router.post('/download-excel-log-inward-daily-report', LogInwardDailyReportExcel);

export default router;