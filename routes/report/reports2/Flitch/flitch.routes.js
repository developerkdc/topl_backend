import { FlitchDailyReportExcel } from '../../../../controllers/reports2/Flitch/flitchDailyReport.js';
import { ItemWiseFlitchReportExcel } from '../../../../controllers/reports2/Flitch/itemWiseFlitch.js';
import { LogWiseFlitchReportExcel } from '../../../../controllers/reports2/Flitch/logWiseFlitch.js';
import express from 'express';

const router = express.Router();

//flitch daily report
router.post('/download-excel-flitch-daily-report', FlitchDailyReportExcel);

//item wise flitch report
router.post('/download-excel-item-wise-flitch-report', ItemWiseFlitchReportExcel);

//log wise flitch report
router.post('/download-excel-log-wise-flitch-report', LogWiseFlitchReportExcel);

export default router;
