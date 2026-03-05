import { OtherGoodsMachineWiseReportExcel } from '../../../../controllers/reports2/Other_Goods/MachineWiseReport.js';
import { OtherItemReportExcel } from '../../../../controllers/reports2/Other_Goods/OtherItemReport.js';
import express from 'express';
import { otherGoodsDailyReportExcel } from '../../../../controllers/reports2/Other_Goods/otherGoodsDailyReport.js';
import { otherGoodsConsumptionReportExcel } from '../../../../controllers/reports2/Other_Goods/otherGoodsConsumptionReport.js';
import { otherGoodsInwardReportExcel } from '../../../../controllers/reports2/Other_Goods/otherGoodsInwardReport.js';

const router = express.Router();

// Other goods daily report
router.post('/download-other-goods-daily-report', otherGoodsDailyReportExcel);

// Other goods consumption report
router.post('/download-other-goods-consumption-report', otherGoodsConsumptionReportExcel);
router.post('/download-excel-machine-wise-report', OtherGoodsMachineWiseReportExcel);
router.post('/download-excel-other-item-report', OtherItemReportExcel);
// Inward Report
router.post('/download-other-goods-inward-report', otherGoodsInwardReportExcel);

export default router;