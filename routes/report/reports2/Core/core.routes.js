import { CoreStockReportExcel } from '../../../../controllers/reports2/Core/coreStockReport.js';
import express from 'express';

const router = express.Router();

// core stock report
router.post('/download-stock-report-core', CoreStockReportExcel);

export default router;
