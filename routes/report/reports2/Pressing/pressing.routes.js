import { PressingDailyReportExcel } from '../../../../controllers/reports2/Pressing/pressingDailyReport.js';
import { PressingStockRegisterExcel } from '../../../../controllers/reports2/Pressing/pressingStockRegister.js';
import express from 'express';

const router = express.Router();

// pressing daily report
router.post('/download-excel-pressing-daily-report', PressingDailyReportExcel);

// pressing stock register
router.post('/download-excel-pressing-stock-register', PressingStockRegisterExcel);

export default router;
