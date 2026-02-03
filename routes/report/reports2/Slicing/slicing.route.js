import { SlicingDailyReportExcel } from '../../../../controllers/reports2/Slicing/slicingDailyReport.js';
import express from 'express';

const router = express.Router();

// slicing daily report
router.post('/download-excel-slicing-daily-report', SlicingDailyReportExcel);

export default router;
