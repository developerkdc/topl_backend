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

  if (
    reportConfig.type === 'DATE' &&
    !payload?.filters?.reportDate
  ) {
    return next(new ApiError('reportDate is required for date reports', 400));
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
