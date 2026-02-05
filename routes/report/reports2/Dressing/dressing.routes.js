import { DressingDailyReportExcel } from '../../../../controllers/reports2/Dressing/dressingDailyReport.js';
import { DressingStockRegisterExcel } from '../../../../controllers/reports2/Dressing/dressingStockRegister.js';
import { LogWiseDressingReportExcel } from '../../../../controllers/reports2/Flitch/logWiseDressingReport.js';
import express from 'express';

const router = express.Router();

// dressing daily report
router.post('/download-excel-dressing-daily-report', DressingDailyReportExcel);

// dressing stock register
router.post('/download-excel-dressing-stock-register', DressingStockRegisterExcel);

// log wise dressing report (Dressing Stock Register By LogX)
router.post('/download-excel-log-wise-dressing-report', LogWiseDressingReportExcel);

export default router;
