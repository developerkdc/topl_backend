import { PressingDailyReportExcel } from '../../../../controllers/reports2/Pressing/pressingDailyReport.js';
import { PressingStockRegisterExcel } from '../../../../controllers/reports2/Pressing/pressingStockRegister.js';
import { PressingStockRegisterReport1Excel } from '../../../../controllers/reports2/Pressing/pressingStockRegisterReport1.js';
import { PressingStockRegisterReport2Excel } from '../../../../controllers/reports2/Pressing/pressingStockRegisterReport2.js';
import { PressingStockRegisterReport3Excel } from '../../../../controllers/reports2/Pressing/pressingStockRegisterReport3.js';
import express from 'express';

const router = express.Router();

// pressing daily report
router.post('/download-excel-pressing-daily-report', PressingDailyReportExcel);

// pressing stock register (original)
router.post('/download-excel-pressing-stock-register', PressingStockRegisterExcel);

// pressing stock register — sales name, thickness, other process wise (Report 1)
router.post(
  '/download-excel-pressing-stock-register-sales-thickness-process',
  PressingStockRegisterReport1Excel
);

// pressing stock register — group no wise (Report 2)
router.post(
  '/download-excel-pressing-stock-register-group-wise',
  PressingStockRegisterReport2Excel
);

// pressing stock register — sales name, thickness (Report 3)
router.post(
  '/download-excel-pressing-stock-register-sales-thickness',
  PressingStockRegisterReport3Excel
);

export default router;
