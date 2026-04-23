import express from 'express';
import { PreviewDisplayReport } from '../controllers/displayReports.controller.js';

const displayReportsRouter = express.Router();

displayReportsRouter.post('/display-reports/preview', PreviewDisplayReport);

export default displayReportsRouter;
