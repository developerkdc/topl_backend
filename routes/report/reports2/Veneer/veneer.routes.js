import { VeneerInwardReportExcel } from '../../../../controllers/reports2/Veneer/veneerInwardReport.js';
import express from 'express';

const router = express.Router();

// veneer inward report
router.post('/download-excel-veneer-inward-report', VeneerInwardReportExcel);

export default router;
