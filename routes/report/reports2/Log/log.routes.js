import { LogInwardDailyReportExcel } from '../../../../controllers/reports2/Log/logInward.js';
import { ItemWiseInwardDailyReportExcel } from '../../../../controllers/reports2/Log/itemWiseInward.js';
import { LogItemWiseInwardDailyReportExcel } from '../../../../controllers/reports2/Log/logItemWiseInward.js';
import { LogItemFurtherProcessReportExcel } from '../../../../controllers/reports2/Log/logItemFurtherProcess.js';
import express from 'express';

const router = express.Router();

//log inward
router.post('/download-excel-log-inward-daily-report', LogInwardDailyReportExcel);

//item wise inward
router.post('/download-excel-item-wise-inward-daily-report', ItemWiseInwardDailyReportExcel);

//log item wise inward
router.post('/download-excel-log-item-wise-inward-daily-report', LogItemWiseInwardDailyReportExcel);

//log item further process
router.post('/download-excel-log-item-further-process-report', LogItemFurtherProcessReportExcel);

export default router;
