import {
  plywoodStockReportCsv,
  plywoodItemWiseStockReportCsv,
} from '../../../../controllers/reports2/Plywood/plywoodStockReport.js';
import express from 'express';

const router = express.Router();

// plywood stock report
router.post('/download-stock-report-plywood', plywoodStockReportCsv);
// plywood stock report – item-wise
router.post('/download-stock-report-plywood-item-wise', plywoodItemWiseStockReportCsv);

export default router;
