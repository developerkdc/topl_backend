import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/errors/apiError.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { getDisplayReportById } from '../config/reportRegistry.js';
import {
  buildDownloadPayload,
  buildPreviewFromWorkbook,
  requestDownloadForPreview,
  resolveExcelPathFromLink,
} from '../services/preview.service.js';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const isValidDateInput = (value) => ISO_DATE_REGEX.test(String(value || '').trim());

export const PreviewDisplayReport = catchAsync(async (req, res, next) => {
  const { reportId, filters = {} } = req.body || {};

  if (!reportId) {
    return next(new ApiError('reportId is required', 400));
  }

  const reportConfig = getDisplayReportById(reportId);
  if (!reportConfig) {
    return next(new ApiError('Invalid reportId', 400));
  }

  const payload = buildDownloadPayload({ reportType: reportConfig.type, filters });

  if (
    reportConfig.type === 'RANGE' &&
    (!payload.startDate || !payload.endDate)
  ) {
    return next(new ApiError('startDate and endDate are required for range reports', 400));
  }

  if (reportConfig.type === 'RANGE') {
    const startDate = String(payload?.startDate || '').trim();
    const endDate = String(payload?.endDate || '').trim();
    const todayDate = getTodayDateString();

    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return next(
        new ApiError('startDate and endDate must be valid dates in YYYY-MM-DD format', 400)
      );
    }

    if (startDate > endDate) {
      return next(new ApiError('startDate cannot be greater than endDate', 400));
    }

    if (startDate > todayDate || endDate > todayDate) {
      return next(new ApiError('Future dates are not allowed', 400));
    }
  }

  if (
    reportConfig.type === 'DATE' &&
    !payload?.filters?.reportDate
  ) {
    return next(new ApiError('reportDate is required for date reports', 400));
  }

  if (reportConfig.type === 'DATE') {
    const reportDate = String(payload?.filters?.reportDate || '').trim();
    const todayDate = getTodayDateString();

    if (!isValidDateInput(reportDate)) {
      return next(new ApiError('reportDate must be a valid date in YYYY-MM-DD format', 400));
    }

    if (reportDate > todayDate) {
      return next(new ApiError('Future dates are not allowed', 400));
    }
  }

  const downloadResponse = await requestDownloadForPreview({
    req,
    endpoint: reportConfig.endpoint,
    payload,
  });

  if (downloadResponse.status >= 400) {
    const message =
      downloadResponse?.data?.message ||
      downloadResponse?.data?.error ||
      'Failed to generate report preview';

    return res
      .status(downloadResponse.status)
      .json(new ApiResponse(downloadResponse.status, message, []));
  }

  const excelLink = downloadResponse?.data?.result;
  if (!excelLink || typeof excelLink !== 'string') {
    return next(new ApiError('Report file link is missing from download response', 500));
  }

  const excelPath = await resolveExcelPathFromLink(excelLink);
  if (!excelPath) {
    return next(new ApiError('Generated report file could not be resolved on server', 404));
  }

  const preview = await buildPreviewFromWorkbook(excelPath);

  return res.status(200).json(
    new ApiResponse(200, 'Report preview generated successfully', {
      reportId: reportConfig.id,
      reportName: reportConfig.name,
      reportType: reportConfig.type,
      sourceEndpoint: reportConfig.endpoint,
      excelLink,
      ...preview,
    })
  );
});
