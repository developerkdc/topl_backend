import { ClippingDailyReportExcel } from '../../../../controllers/reports2/TappingORClipping/clippingDailyReport.js';
import { LogWiseTappingORClippingReportExcel } from '../../../../controllers/reports2/TappingORClipping/logWiseTappingORClipping.js';
import { TappingORClippingStockRegisterExcel } from '../../../../controllers/reports2/TappingORClipping/tappingORClippingStockRegister.js';
import express from 'express';

const router = express.Router();

// Clipping (Tapping) daily report
router.post('/download-excel-clipping-daily-report', ClippingDailyReportExcel);

// Log wise tapping/clipping (Clipping Item Stock Register)
router.post(
  '/download-excel-log-wise-tapping-or-clipping-report',
  LogWiseTappingORClippingReportExcel
);

// Tapping/Clipping stock register
router.post(
  '/download-excel-tapping-or-clipping-stock-register',
  TappingORClippingStockRegisterExcel
);

export default router;
