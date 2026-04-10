import axios from 'axios';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

const INVISIBLE_CHAR_REGEX = /[\u200B-\u200D\uFEFF]/g;

const normalizeTextValue = (value) =>
  String(value ?? '')
    .replace(INVISIBLE_CHAR_REGEX, '')
    .trim();

const hasMeaningfulValue = (value) => normalizeTextValue(value) !== '';

const parseCellAddress = (cellRef) => {
  const match = String(cellRef || '').match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  const row = Number(match[2]);
  let col = 0;
  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { row, col };
};

const parseRange = (rangeRef) => {
  const [startRef, endRef] = String(rangeRef || '').split(':');
  const start = parseCellAddress(startRef);
  const end = parseCellAddress(endRef || startRef);
  if (!start || !end) return null;
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
  };
};

const normalizeCellValue = (rawValue, textValue) => {
  if (typeof textValue === 'string' && hasMeaningfulValue(textValue)) {
    return normalizeTextValue(textValue);
  }

  if (rawValue == null) return '';

  if (rawValue instanceof Date) {
    return rawValue.toISOString().split('T')[0];
  }

  if (typeof rawValue === 'object') {
    if (Array.isArray(rawValue.richText)) {
      return normalizeTextValue(rawValue.richText.map((chunk) => chunk?.text || '').join(''));
    }
    if (rawValue.text) return normalizeTextValue(rawValue.text);
    if (rawValue.result != null) return normalizeTextValue(rawValue.result);
    if (rawValue.hyperlink) return normalizeTextValue(rawValue.hyperlink);
  }

  return normalizeTextValue(rawValue);
};

const getCellDisplayValue = (worksheet, row, col) => {
  const cell = worksheet.getRow(row).getCell(col);

  if (cell.master) {
    const isMasterCell = String(cell.address || '') === String(cell.master.address || '');
    if (!isMasterCell) {
      const cellAddress = parseCellAddress(cell.address);
      const masterAddress = parseCellAddress(cell.master.address);

      // Show merged text on subordinate cells only for vertical merges
      // (same column, different row). For horizontal merges, keep blanks.
      if (
        cellAddress &&
        masterAddress &&
        cellAddress.col === masterAddress.col
      ) {
        return normalizeCellValue(cell.master.value, cell.master.text);
      }

      return '';
    }
  }

  const directValue = normalizeCellValue(cell.value, cell.text);
  if (directValue) return directValue;

  if (cell.master) return normalizeCellValue(cell.master.value, cell.master.text);

  return '';
};

const buildForwardHeaders = (incomingHeaders = {}) => {
  const headerNames = ['authorization', 'cookie', 'x-access-token', 'x-refresh-token'];
  const forwarded = {};

  headerNames.forEach((name) => {
    if (incomingHeaders?.[name]) {
      forwarded[name] = incomingHeaders[name];
    }
  });

  return forwarded;
};

const getProtocol = (req) => {
  const forwardedProto = req?.headers?.['x-forwarded-proto'];
  if (forwardedProto) {
    return String(forwardedProto).split(',')[0].trim();
  }
  return req?.protocol || 'http';
};

const getForwardedHost = (req) => {
  const forwardedHost = req?.headers?.['x-forwarded-host'];
  if (forwardedHost) {
    return String(forwardedHost).split(',')[0].trim();
  }
  return req?.get?.('host') || '';
};

const getApiPrefix = (req) => {
  const originalUrl = String(req?.originalUrl || '');
  const matchedApiPrefix = originalUrl.match(/^(\/api\/[^/]+)/i);
  if (matchedApiPrefix?.[1]) {
    return matchedApiPrefix[1];
  }

  return String(req?.baseUrl || '').replace(/\/report(?:\/.*)?$/, '');
};

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const buildAbsoluteUrl = (baseUrl, pathname) => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPathname = `/${String(pathname || '').replace(/^\/+/, '')}`;
  return `${normalizedBaseUrl}${normalizedPathname}`;
};

const buildRequestUrlCandidates = ({ req, endpoint }) => {
  const apiPrefix = getApiPrefix(req);
  const requestPath = `${apiPrefix}${endpoint}`;
  const protocol = getProtocol(req);
  const host = req?.get?.('host');
  const forwardedHost = getForwardedHost(req);
  const configuredOrigin = (() => {
    try {
      return process.env.APP_URL ? new URL(process.env.APP_URL).origin : '';
    } catch {
      return normalizeBaseUrl(process.env.APP_URL);
    }
  })();
  const localPort = req?.socket?.localPort;

  const candidates = new Set();

  if (localPort) {
    candidates.add(buildAbsoluteUrl(`http://127.0.0.1:${localPort}`, requestPath));
    candidates.add(buildAbsoluteUrl(`http://localhost:${localPort}`, requestPath));
  }

  if (configuredOrigin) {
    candidates.add(buildAbsoluteUrl(configuredOrigin, requestPath));
  }

  if (forwardedHost) {
    candidates.add(buildAbsoluteUrl(`${protocol}://${forwardedHost}`, requestPath));
    candidates.add(buildAbsoluteUrl(`https://${forwardedHost}`, requestPath));
    candidates.add(buildAbsoluteUrl(`http://${forwardedHost}`, requestPath));
  }

  if (host) {
    candidates.add(buildAbsoluteUrl(`${protocol}://${host}`, requestPath));
    candidates.add(buildAbsoluteUrl(`https://${host}`, requestPath));
    candidates.add(buildAbsoluteUrl(`http://${host}`, requestPath));
  }

  return [...candidates].filter(Boolean);
};

const isHtmlResponse = (response) => {
  const contentType = String(response?.headers?.['content-type'] || '').toLowerCase();
  if (contentType.includes('text/html')) return true;

  const responseText = typeof response?.data === 'string' ? response.data : '';
  return /<!doctype html>|<html/i.test(responseText);
};

const hasDownloadLink = (response) =>
  Boolean(response?.data && typeof response.data.result === 'string' && response.data.result.trim());

const hasJsonMessage = (response) =>
  Boolean(response?.data && typeof response.data === 'object' && typeof response.data.message === 'string');

export const buildDownloadPayload = ({ reportType, filters = {} }) => {
  if (reportType === 'RANGE') {
    return {
      startDate: filters?.startDate || null,
      endDate: filters?.endDate || null,
    };
  }

  return {
    filters: {
      reportDate: filters?.reportDate || null,
    },
  };
};

export const requestDownloadForPreview = async ({ req, endpoint, payload }) => {
  const requestUrls = buildRequestUrlCandidates({ req, endpoint });
  let lastResponse = null;
  let lastError = null;

  for (const requestUrl of requestUrls) {
    try {
      const response = await axios.post(requestUrl, payload, {
        timeout: 180000,
        validateStatus: () => true,
        headers: buildForwardHeaders(req.headers),
      });

      lastResponse = response;

      if (hasDownloadLink(response)) {
        return response;
      }

      if (response.status >= 400) {
        if (hasJsonMessage(response) || !isHtmlResponse(response)) {
          return response;
        }
        continue;
      }

      if (isHtmlResponse(response)) {
        continue;
      }

      if (hasJsonMessage(response)) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  if (lastResponse) {
    return lastResponse;
  }

  return {
    status: 502,
    data: {
      message:
        'Preview could not reach the existing report download endpoint. Check APP_URL, proxy headers, or server port configuration.',
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};

const buildPathCandidates = (pathnameValue) => {
  const rootCandidates = [process.cwd(), global?.config?.dirname].filter(Boolean);
  const normalizedPath = String(pathnameValue || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!normalizedPath) return [];

  const candidates = new Set();

  rootCandidates.forEach((rootPath) => {
    candidates.add(path.resolve(rootPath, normalizedPath));

    if (!normalizedPath.startsWith('public/')) {
      candidates.add(path.resolve(rootPath, 'public', normalizedPath));
    }

    if (normalizedPath.startsWith('public/')) {
      candidates.add(path.resolve(rootPath, normalizedPath));
    }

    if (normalizedPath.startsWith('upload/')) {
      candidates.add(path.resolve(rootPath, normalizedPath));
      candidates.add(path.resolve(rootPath, 'public', normalizedPath));
    }

    if (normalizedPath.startsWith('reports/')) {
      candidates.add(path.resolve(rootPath, 'public', normalizedPath));
    }

    if (normalizedPath.startsWith('public/upload/')) {
      const withoutPublic = normalizedPath.replace(/^public\//, '');
      candidates.add(path.resolve(rootPath, withoutPublic));
    }

    if (normalizedPath.startsWith('public/reports/')) {
      const withoutPublic = normalizedPath.replace(/^public\//, '');
      candidates.add(path.resolve(rootPath, withoutPublic));
    }
  });

  return [...candidates];
};

export const resolveExcelPathFromLink = async (excelLink) => {
  let pathnameValue = '';

  try {
    const parsed = new URL(String(excelLink));
    pathnameValue = decodeURIComponent(parsed.pathname || '');
  } catch {
    pathnameValue = decodeURIComponent(String(excelLink || ''));
  }

  const candidates = buildPathCandidates(pathnameValue);

  for (const candidate of candidates) {
    if (!String(candidate).toLowerCase().endsWith('.xlsx')) continue;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  return null;
};

const detectHeaderRowIndex = (worksheet, maxColumns) => {
  const searchLimit = Math.min(20, worksheet.rowCount || 0);

  let bestRow = 1;
  let bestScore = -1;

  for (let rowIndex = 1; rowIndex <= searchLimit; rowIndex += 1) {
    const nonEmptyValues = [];
    let alphaCount = 0;

    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
      if (!hasMeaningfulValue(value)) continue;
      nonEmptyValues.push(value);
      if (/[A-Za-z]/.test(value)) alphaCount += 1;
    }

    const nonEmpty = nonEmptyValues.length;
    if (nonEmpty < 2) continue;

    const uniqueValueCount = new Set(
      nonEmptyValues.map((value) => normalizeTextValue(value).toLowerCase())
    ).size;

    if (uniqueValueCount <= 1) continue;

    const alphaRatio = alphaCount / nonEmpty;
    if (alphaRatio < 0.3) continue;

    const score = alphaCount * 2 + nonEmpty + uniqueValueCount;
    if (score > bestScore || (score === bestScore && rowIndex > bestRow)) {
      bestScore = score;
      bestRow = rowIndex;
    }
  }

  if (bestScore >= 0) return bestRow;

  let fallbackRow = 1;
  let fallbackCount = -1;
  let fallbackUniqueCount = -1;
  for (let rowIndex = 1; rowIndex <= searchLimit; rowIndex += 1) {
    const nonEmptyValues = [];
    let nonEmpty = 0;
    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
      if (hasMeaningfulValue(value)) {
        nonEmpty += 1;
        nonEmptyValues.push(value);
      }
    }

    const uniqueValueCount = new Set(
      nonEmptyValues.map((value) => normalizeTextValue(value).toLowerCase())
    ).size;

    if (
      nonEmpty > fallbackCount ||
      (nonEmpty === fallbackCount && uniqueValueCount > fallbackUniqueCount)
    ) {
      fallbackCount = nonEmpty;
      fallbackUniqueCount = uniqueValueCount;
      fallbackRow = rowIndex;
    }
  }

  return fallbackRow;
};

const extractHeaderGroups = ({ worksheet, headerRowIndex, keepColumns }) => {
  const groupRowIndex = headerRowIndex - 1;
  if (groupRowIndex < 1) return [];

  const groupRowValues = keepColumns
    .map((column) => normalizeTextValue(getCellDisplayValue(worksheet, groupRowIndex, column)))
    .filter(Boolean);

  const uniqueGroupRowValueCount = new Set(
    groupRowValues.map((value) => value.toLowerCase())
  ).size;

  // Ignore banner rows (for example "Date: ...") that are not real grouped headers.
  if (groupRowValues.length > 0 && uniqueGroupRowValueCount <= 1) {
    return [];
  }

  const merges = worksheet?.model?.merges || [];
  const columnMap = new Map(keepColumns.map((col, index) => [col, index]));
  const groups = [];
  const groupedIndexes = new Set();

  merges.forEach((mergeRef) => {
    const range = parseRange(mergeRef);
    if (!range) return;
    if (range.startRow !== groupRowIndex || range.endRow !== groupRowIndex) return;
    if (range.endCol <= range.startCol) return;

    const label = getCellDisplayValue(worksheet, groupRowIndex, range.startCol);
    if (!label) return;

    const coveredIndexes = [];
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      if (columnMap.has(col)) {
        coveredIndexes.push(columnMap.get(col));
      }
    }

    if (coveredIndexes.length <= 1) return;

    groups.push({
      label,
      startIndex: Math.min(...coveredIndexes),
      endIndex: Math.max(...coveredIndexes),
    });

    coveredIndexes.forEach((index) => groupedIndexes.add(index));
  });

  keepColumns.forEach((originalColumn, normalizedIndex) => {
    if (groupedIndexes.has(normalizedIndex)) return;

    const topLabel = normalizeTextValue(getCellDisplayValue(worksheet, groupRowIndex, originalColumn));
    if (!topLabel) return;

    const headerLabel = normalizeTextValue(
      getCellDisplayValue(worksheet, headerRowIndex, originalColumn)
    );

    if (topLabel.toLowerCase() === headerLabel.toLowerCase()) return;

    groups.push({
      label: topLabel,
      startIndex: normalizedIndex,
      endIndex: normalizedIndex,
    });
  });

  groups.sort((left, right) => left.startIndex - right.startIndex);
  return groups;
};

export const buildPreviewFromWorkbook = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets?.[0];
  if (!worksheet) {
    return {
      title: 'Report Preview',
      headers: [],
      headerGroups: [],
      rows: [],
      rowCount: 0,
    };
  }

  const mergeRanges = worksheet?.model?.merges || [];
  const maxMergeColumn = mergeRanges.reduce((currentMax, mergeRef) => {
    const range = parseRange(mergeRef);
    if (!range) return currentMax;
    return Math.max(currentMax, range.endCol);
  }, 0);

  const maxColumns = Math.max(worksheet.actualColumnCount || 0, maxMergeColumn || 0, 1);
  const headerRowIndex = detectHeaderRowIndex(worksheet, maxColumns);

  let title = worksheet.name || 'Report Preview';
  for (let rowIndex = 1; rowIndex < headerRowIndex; rowIndex += 1) {
    const rowValues = [];
    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
      if (hasMeaningfulValue(value)) rowValues.push(normalizeTextValue(value));
    }

    if (!rowValues.length) continue;

    const uniqueRowValues = new Set(rowValues.map((value) => value.toLowerCase()));
    if (uniqueRowValues.size === 1) {
      title = rowValues[0];
      break;
    }
  }

  const originalHeaders = [];
  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    originalHeaders.push(getCellDisplayValue(worksheet, headerRowIndex, colIndex));
  }

  const originalRows = [];
  let blankRowStreak = 0;
  const blankRowBreakThreshold = 150;
  for (let rowIndex = headerRowIndex + 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const rowObject = {};
    let hasAnyValue = false;

    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
      rowObject[`c${colIndex}`] = value;
      if (hasMeaningfulValue(value)) hasAnyValue = true;
    }

    if (!hasAnyValue) {
      if (!originalRows.length) continue;

      blankRowStreak += 1;
      if (blankRowStreak >= blankRowBreakThreshold) {
        break;
      }
      continue;
    }

    blankRowStreak = 0;
    originalRows.push({
      excelRowIndex: rowIndex,
      values: rowObject,
    });
  }

  const keepColumns = [];
  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    const hasHeader = hasMeaningfulValue(originalHeaders[colIndex - 1]);
    const hasRowData = originalRows.some((row) =>
      hasMeaningfulValue(row?.values?.[`c${colIndex}`])
    );
    if (hasHeader || hasRowData) keepColumns.push(colIndex);
  }

  const normalizedKeepColumns = keepColumns.length
    ? keepColumns
    : [...Array(maxColumns).keys()].map((index) => index + 1);

  const headers = normalizedKeepColumns.map((originalCol, normalizedIndex) => {
    const rawLabel = normalizeTextValue(originalHeaders[originalCol - 1]);
    return {
      key: `c${normalizedIndex + 1}`,
      label: rawLabel || `Column ${normalizedIndex + 1}`,
    };
  });

  const rows = [...originalRows]
    .sort((left, right) => left.excelRowIndex - right.excelRowIndex)
    .map((rowEntry) => {
      const row = rowEntry?.values || {};
      const normalizedRow = {};
      normalizedKeepColumns.forEach((originalCol, normalizedIndex) => {
        normalizedRow[`c${normalizedIndex + 1}`] = row[`c${originalCol}`] || '';
      });
      normalizedRow.__excelRowIndex = rowEntry.excelRowIndex;
      return normalizedRow;
    });

  const headerGroups = extractHeaderGroups({
    worksheet,
    headerRowIndex,
    keepColumns: normalizedKeepColumns,
  });

  return {
    title,
    headers,
    headerGroups,
    rows,
    rowCount: rows.length,
  };
};
