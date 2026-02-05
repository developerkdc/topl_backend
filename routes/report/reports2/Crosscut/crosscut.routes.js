import { CrosscutDailyReportExcel } from '../../../../controllers/reports2/Crosscut/crosscutDailyReport.js';
import { LogWiseCrosscutReportExcel } from '../../../../controllers/reports2/Crosscut/logWiseCrosscut.js';
import express from 'express';

const router = express.Router();

// crosscut daily report
router.post('/download-excel-crosscutting-daily-report', CrosscutDailyReportExcel);

// log wise crosscut report
router.post('/download-excel-log-wise-crosscut-report', LogWiseCrosscutReportExcel);

export default router;
