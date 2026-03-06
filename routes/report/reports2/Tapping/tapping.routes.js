import { TappingDailyReportExcel } from '../../../../controllers/reports2/Tapping/Daily_Report/tappingDailyReport.js';
import { TappingStockRegisterExcel } from '../../../../controllers/reports2/Tapping/Stock_Register/tappingStockRegister.js';
import { TappingStockRegisterThicknessWiseExcel } from '../../../../controllers/reports2/Tapping/Stock_Register/tappingStockRegisterThicknessWise.js';
import { TappingItemStockRegisterThicknessWiseExcel } from '../../../../controllers/reports2/Tapping/Stock_Register/tappingItemStockRegisterThicknessWise.js';
import express from 'express';

const router = express.Router();

// Tapping (Splicing) daily report
router.post('/download-excel-tapping-daily-report', TappingDailyReportExcel);

// Tapping (Splicing) stock register — sales name wise
router.post('/download-excel-tapping-stock-register', TappingStockRegisterExcel);

// Tapping (Splicing) stock register — sales name + thickness wise (Report -1)
router.post('/download-excel-tapping-stock-register-thickness-wise', TappingStockRegisterThicknessWiseExcel);

// Tapping (Splicing) stock register — item + thickness wise, no sales name (Report -2)
router.post('/download-excel-tapping-item-stock-register-thickness-wise', TappingItemStockRegisterThicknessWiseExcel);

export default router;
