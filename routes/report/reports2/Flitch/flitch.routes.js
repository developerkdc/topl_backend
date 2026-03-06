import { FlitchDailyReportExcel } from '../../../../controllers/reports2/Flitch/flitchDailyReport.js';
import { ItemWiseFlitchReportExcel } from '../../../../controllers/reports2/Flitch/itemWiseFlitch.js';
import { LogWiseFlitchReportExcel } from '../../../../controllers/reports2/Flitch/logWiseFlitch.js';
import { FlitchItemFurtherProcessReportExcel } from '../../../../controllers/reports2/Flitch/flitchItemFurtherProcess.js';
import express from 'express';

const router = express.Router();

//flitch daily report
router.post('/download-excel-flitch-daily-report', FlitchDailyReportExcel);

//item wise flitch report
router.post('/download-excel-item-wise-flitch-report', ItemWiseFlitchReportExcel);

//log wise flitch report
router.post('/download-excel-log-wise-flitch-report', LogWiseFlitchReportExcel);

//flitch item further process report
router.post('/download-excel-flitch-item-further-process-report', FlitchItemFurtherProcessReportExcel);

export default router;
