import {
  fleeceStockReportCsv,
  fleeceItemWiseStockReportCsv,
  fleeceStockReportByInwardCsv,
} from '../../../../controllers/reports2/Fleece/fleeceStockReport.js';
import express from 'express';

const router = express.Router();

// Fleece stock report
router.post('/download-stock-report-fleece', fleeceStockReportCsv);
// Fleece stock report – item-wise
router.post('/download-stock-report-fleece-item-wise', fleeceItemWiseStockReportCsv);
// Fleece stock report – by inward number
router.post('/download-stock-report-fleece-by-inward', fleeceStockReportByInwardCsv);

export default router;
