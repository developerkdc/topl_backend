import { FaceStockReportExcel } from '../../../../controllers/reports2/Face/faceStockReport.js';
import express from 'express';

const router = express.Router();

// face stock report
router.post('/download-stock-report-face', FaceStockReportExcel);

export default router;
