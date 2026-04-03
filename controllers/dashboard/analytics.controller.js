import catchAsync from '../../utils/errors/catchAsync.js';
import { fetchDashboardAnalyticsData } from './analytics.service.js';

export const FetchDashboardAnalytics = catchAsync(async (req, res) => {
  const payload = await fetchDashboardAnalyticsData(req.query);
  return res.status(200).json(payload);
});