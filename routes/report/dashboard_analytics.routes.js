import express from 'express';
import { FetchDashboardAnalytics } from '../../controllers/dashboard/analytics.controller.js';

const dashboardAnalyticsRouter = express.Router();

dashboardAnalyticsRouter.get('/dashboard/analytics', FetchDashboardAnalytics);

export default dashboardAnalyticsRouter;

