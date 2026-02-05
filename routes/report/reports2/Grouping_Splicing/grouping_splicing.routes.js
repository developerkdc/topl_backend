import { GroupingSplicingDailyReportExcel } from '../../../../controllers/reports2/Grouping_Splicing/groupingSplicingDailyReport.js';
import { GroupingSplicingStockRegisterExcel } from '../../../../controllers/reports2/Grouping_Splicing/groupingSplicingStockRegister.js';
import express from 'express';

const router = express.Router();

// grouping/splicing (hand splicing) daily report
router.post('/download-excel-grouping-splicing-daily-report', GroupingSplicingDailyReportExcel);

// grouping/splicing stock register
router.post('/download-excel-grouping-splicing-stock-register', GroupingSplicingStockRegisterExcel);

export default router;
