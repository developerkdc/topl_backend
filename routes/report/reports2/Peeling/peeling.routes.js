import { PeelingDailyReportExcel } from '../../../../controllers/reports2/Peeling/peelingDailyReport.js';
import express from 'express';

const router = express.Router();

// peeling daily report
router.post('/download-excel-peeling-daily-report', PeelingDailyReportExcel);

export default router;
