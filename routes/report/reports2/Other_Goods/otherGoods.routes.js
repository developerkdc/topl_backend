import { OtherGoodsMachineWiseReportExcel } from '../../../../controllers/reports2/Other_Goods/MachineWiseReport.js';
import { OtherItemReportExcel } from '../../../../controllers/reports2/Other_Goods/OtherItemReport.js';
import express from 'express';

const router = express.Router();

router.post('/download-excel-machine-wise-report', OtherGoodsMachineWiseReportExcel);
router.post('/download-excel-other-item-report', OtherItemReportExcel);

export default router;
