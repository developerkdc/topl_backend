
import express from 'express';
import { otherGoodsDailyReportExcel } from '../../../../controllers/reports2/Other_Goods/otherGoodsDailyReport.js';
import { otherGoodsConsumptionReportExcel } from '../../../../controllers/reports2/Other_Goods/otherGoodsConsumptionReport.js';
import { otherGoodsInwardReportExcel } from '../../../../controllers/reports2/Other_Goods/otherGoodsInwardReport.js';

const router = express.Router();

// Other goods daily report
router.post('/download-other-goods-daily-report', otherGoodsDailyReportExcel);

// Other goods consumption report
router.post('/download-other-goods-consumption-report', otherGoodsConsumptionReportExcel);

// Inward Report
router.post('/download-other-goods-inward-report', otherGoodsInwardReportExcel);

export default router;