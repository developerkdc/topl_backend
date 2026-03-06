import {
  plywoodStockReportCsv,
  plywoodItemWiseStockReportCsv,
  plywoodStockReportByPelletCsv,
} from '../../../../controllers/reports2/Plywood/plywoodStockReport.js';
import express from 'express';

const router = express.Router();

// plywood stock report
router.post('/download-stock-report-plywood', plywoodStockReportCsv);
// plywood stock report – item-wise
router.post('/download-stock-report-plywood-item-wise', plywoodItemWiseStockReportCsv);
// plywood stock report – by pellet no.
router.post('/download-stock-report-plywood-by-pellet', plywoodStockReportByPelletCsv);

export default router;
