import {
  mdfStockReportCsv,
  mdfItemWiseStockReportCsv,
  mdfStockReportByPelletCsv,
} from '../../../../controllers/reports2/MDF/mdfStockReport.js';
import express from 'express';

const router = express.Router();

// MDF stock report
router.post('/download-stock-report-mdf', mdfStockReportCsv);
// MDF stock report – item-wise
router.post('/download-stock-report-mdf-item-wise', mdfItemWiseStockReportCsv);
// MDF stock report – by pellet no.
router.post('/download-stock-report-mdf-by-pellet', mdfStockReportByPelletCsv);

export default router;
