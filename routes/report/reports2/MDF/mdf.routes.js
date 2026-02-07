import {
  mdfStockReportCsv,
  mdfItemWiseStockReportCsv,
} from '../../../../controllers/reports2/MDF/mdfStockReport.js';
import express from 'express';

const router = express.Router();

// MDF stock report
router.post('/download-stock-report-mdf', mdfStockReportCsv);
// MDF stock report – item-wise
router.post('/download-stock-report-mdf-item-wise', mdfItemWiseStockReportCsv);

export default router;
