import { SmokingDyingDailyReportExcel } from '../../../../controllers/reports2/Smoking&Dying/smokingDyingDailyReport.js';
import { SmokingDyingStockRegisterExcel } from '../../../../controllers/reports2/Smoking&Dying/smokingDyingStockRegister.js';
import express from 'express';

const router = express.Router();

// Smoking&Dying daily report (Dyeing Details Report)
router.post('/download-excel-smoking-dying-daily-report', SmokingDyingDailyReportExcel);

// Smoking&Dying stock register
router.post('/download-excel-smoking-dying-stock-register', SmokingDyingStockRegisterExcel);

export default router;
