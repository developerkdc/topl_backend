import { GroupingDailyReportExcel } from '../../../../controllers/reports2/Grouping/Daily_Report/groupingDailyReport.js';
import { GroupingStockRegisterExcel } from '../../../../controllers/reports2/Grouping/Stock_Register/groupingStockRegister.js';
import { GroupingStockRegisterThicknessWiseExcel } from '../../../../controllers/reports2/Grouping/Stock_Register/groupingStockRegisterThicknessWise.js';
import { GroupingStockRegisterGroupWiseExcel } from '../../../../controllers/reports2/Grouping/Stock_Register/groupingStockRegisterGroupWise.js';
import express from 'express';

const router = express.Router();

// Grouping daily report
router.post('/download-excel-grouping-daily-report', GroupingDailyReportExcel);

// Grouping stock register (date wise)
router.post('/download-excel-grouping-stock-register', GroupingStockRegisterExcel);

// Grouping stock register (thickness wise)
router.post('/download-excel-grouping-stock-register-thickness-wise', GroupingStockRegisterThicknessWiseExcel);

// Grouping stock register (group wise)
router.post('/download-excel-grouping-stock-register-group-wise', GroupingStockRegisterGroupWiseExcel);

export default router;
