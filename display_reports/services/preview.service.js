import axios from 'axios';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

const INVISIBLE_CHAR_REGEX = /[\u200B-\u200D\uFEFF\u00A0]/g;
const DATE_TOKEN_REGEX = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i;
const HEADER_METADATA_REGEX = /\b(date|from|to|report)\b/i;
const NUMERIC_TEXT_REGEX = /^-?\d+(?:,\d{3})*(?:\.\d+)?$/;
const HEADER_HINT_REGEX =
  /\b(item|supplier|invoice|physical|opening|closing|issue|done|balance|sales|challan|sqm|cmt|cbm|mtr|sheets?|rolls?|leaves?|thickness|group|log|name|date|remarks?|id|qty|quantity)\b/i;
const TOTAL_OR_SUMMARY_REGEX = /\b(total|grand total|summary)\b/i;

const normalizeTextValue = (value) =>
  String(value ?? '')
    .replace(INVISIBLE_CHAR_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();

const hasMeaningfulValue = (value) => normalizeTextValue(value) !== '';

const addThousandsSeparators = (value) => {
  const [integerPartRaw, decimalPart = ''] = String(value || '').split('.');
  const isNegative = integerPartRaw.startsWith('-');
  const integerPart = isNegative ? integerPartRaw.slice(1) : integerPartRaw;
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const signedInteger = isNegative ? `-${groupedInteger}` : groupedInteger;
  return decimalPart ? `${signedInteger}.${decimalPart}` : signedInteger;
};

const formatNumberUsingExcelNumFmt = (rawNumber, numFmtValue) => {
  if (typeof rawNumber !== 'number' || !Number.isFinite(rawNumber)) return null;

  const numFmt = String(numFmtValue || '').trim();
  if (!numFmt) return null;

  const primarySection = numFmt.split(';')[0] || '';
  const normalizedSection = primarySection
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*]/g, '')
    .replace(/\\./g, '')
    .trim();

  if (!normalizedSection) return null;
  if (/%/.test(normalizedSection)) return null;
  if (/[dyhms]/i.test(normalizedSection)) return null;
  if (/general/i.test(normalizedSection)) return null;

  const decimalMatch = normalizedSection.match(/\.([0#]+)/);
  const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
  const usesGrouping = normalizedSection.includes(',');

  const fixedValue = rawNumber.toFixed(decimalPlaces);
  return usesGrouping ? addThousandsSeparators(fixedValue) : fixedValue;
};

const isNumericText = (value) => NUMERIC_TEXT_REGEX.test(normalizeTextValue(value));

const normalizeFloatingPointArtifact = (value) => {
  const normalized = normalizeTextValue(value);
  if (!isNumericText(normalized)) return normalized;

  const hasGrouping = normalized.includes(',');
  const numericSource = normalized.replace(/,/g, '');
  const [integerPart = '', decimalPart = ''] = numericSource.split('.');
  if (!decimalPart || decimalPart.length < 7) return normalized;

  const numericValue = Number(numericSource);
  if (!Number.isFinite(numericValue)) return normalized;

  // Only collapse precision when this is very likely JS floating-point residue,
  // e.g. 6.732000000000001 or 1934.9199999999998.
  const tolerance = Math.max(1e-12, Math.abs(numericValue) * 1e-12);
  const maxDecimalsToCheck = Math.min(12, decimalPart.length);
  let bestCandidate = null;

  for (let decimals = 0; decimals <= maxDecimalsToCheck; decimals += 1) {
    const roundedString = numericValue.toFixed(decimals);
    const roundedValue = Number(roundedString);
    if (!Number.isFinite(roundedValue)) continue;
    if (Math.abs(numericValue - roundedValue) > tolerance) continue;

    const compact = roundedString
      .replace(/(\.\d*?[1-9])0+$/g, '$1')
      .replace(/\.0+$/g, '');
    bestCandidate = compact || '0';
    break;
  }

  if (!bestCandidate) return normalized;
  if (bestCandidate.length + 3 > numericSource.length) return normalized;

  return hasGrouping ? addThousandsSeparators(bestCandidate) : bestCandidate;
};

const isMeaningfulNonZeroDataValue = (value) => {
  const normalized = normalizeTextValue(value);
  if (!normalized) return false;

  if (!isNumericText(normalized)) return true;

  const numericValue = Number(normalized.replace(/,/g, ''));
  if (!Number.isFinite(numericValue)) return true;
  return Math.abs(numericValue) > 0;
};

const isLikelyMetadataHeaderRow = (rowValues = []) => {
  const normalizedValues = rowValues
    .map((value) => normalizeTextValue(value))
    .filter(Boolean);

  if (!normalizedValues.length) return false;

  const joined = normalizedValues.join(' ').toLowerCase();
  const uniqueCount = new Set(normalizedValues.map((value) => value.toLowerCase())).size;
  const hasMetadataWords = HEADER_METADATA_REGEX.test(joined);
  const hasDateToken = DATE_TOKEN_REGEX.test(joined);
  const hasReportWord = /\breport\b/i.test(joined);

  if (uniqueCount <= 1 && (hasMetadataWords || hasDateToken || hasReportWord)) {
    return true;
  }

  if (normalizedValues.length <= 4 && hasMetadataWords && (hasDateToken || hasReportWord)) {
    return true;
  }

  return false;
};

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

const getHorizontalMergeRangesForRow = (worksheet, rowIndex) => {
  if (!worksheet || rowIndex < 1) return [];

  const merges = worksheet?.model?.merges || [];
  return merges
    .map((mergeRef) => parseRange(mergeRef))
    .filter(
      (range) =>
        range &&
        range.startRow === rowIndex &&
        range.endRow === rowIndex &&
        range.endCol > range.startCol
    );
};

const getRowProfile = (worksheet, rowIndex, maxColumns) => {
  const values = [];
  let alphaCount = 0;

  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
    if (!hasMeaningfulValue(value)) continue;
    values.push(value);
    if (/[A-Za-z]/.test(String(value || ''))) alphaCount += 1;
  }

  return {
    values,
    nonEmpty: values.length,
    unique: new Set(values.map((value) => normalizeTextValue(value).toLowerCase())).size,
    alphaCount,
  };
};

const normalizeCellValue = (rawValue, textValue, numFmtValue) => {
  const numFmtFormattedNumber = formatNumberUsingExcelNumFmt(rawValue, numFmtValue);
  if (numFmtFormattedNumber != null) {
    return normalizeTextValue(numFmtFormattedNumber);
  }

  if (typeof textValue === 'string' && hasMeaningfulValue(textValue)) {
    return normalizeFloatingPointArtifact(textValue);
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
    if (rawValue.result != null) {
      const resultFormattedNumber = formatNumberUsingExcelNumFmt(
        rawValue.result,
        numFmtValue
      );
      if (resultFormattedNumber != null) {
        return normalizeTextValue(resultFormattedNumber);
      }
      return normalizeFloatingPointArtifact(rawValue.result);
    }
    if (rawValue.hyperlink) return normalizeTextValue(rawValue.hyperlink);
  }

  return normalizeFloatingPointArtifact(rawValue);
};

const buildMergeLookup = (worksheet) => {
  const lookup = new Map();
  const merges = worksheet?.model?.merges || [];

  merges.forEach((mergeRef) => {
    const range = parseRange(mergeRef);
    if (!range) return;

    for (let row = range.startRow; row <= range.endRow; row += 1) {
      for (let col = range.startCol; col <= range.endCol; col += 1) {
        lookup.set(`${row}:${col}`, {
          startRow: range.startRow,
          startCol: range.startCol,
          isTopLeft: row === range.startRow && col === range.startCol,
        });
      }
    }
  });

  return lookup;
};

const getMergeLookup = (worksheet) => {
  if (!worksheet) return new Map();

  if (!worksheet.__previewMergeLookup) {
    worksheet.__previewMergeLookup = buildMergeLookup(worksheet);
  }

  return worksheet.__previewMergeLookup;
};

const getCellDisplayValue = (worksheet, row, col) => {
  const cell = worksheet.getRow(row).getCell(col);
  const mergeLookup = getMergeLookup(worksheet);
  const mergedCellInfo = mergeLookup.get(`${row}:${col}`);

  if (mergedCellInfo && !mergedCellInfo.isTopLeft) {
    // For vertical merges, replicate the master value in each row.
    // For horizontal merges, keep subordinate cells blank.
    if (mergedCellInfo.startCol === col) {
      const masterCell = worksheet
        .getRow(mergedCellInfo.startRow)
        .getCell(mergedCellInfo.startCol);
      return normalizeCellValue(masterCell.value, masterCell.text, masterCell.numFmt);
    }
    return '';
  }

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
        return normalizeCellValue(cell.master.value, cell.master.text, cell.master.numFmt);
      }

      return '';
    }
  }

  const directValue = normalizeCellValue(cell.value, cell.text, cell.numFmt);
  if (directValue) return directValue;

  if (cell.master) {
    return normalizeCellValue(cell.master.value, cell.master.text, cell.master.numFmt);
  }

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

    if (isLikelyMetadataHeaderRow(nonEmptyValues)) continue;

    const uniqueValueCount = new Set(
      nonEmptyValues.map((value) => normalizeTextValue(value).toLowerCase())
    ).size;

    if (uniqueValueCount <= 1) continue;

    const alphaRatio = alphaCount / nonEmpty;
    if (alphaRatio < 0.3) continue;

    const score = alphaCount * 2 + nonEmpty + uniqueValueCount;
    if (score > bestScore || (score === bestScore && rowIndex < bestRow)) {
      bestScore = score;
      bestRow = rowIndex;
    }
  }

  if (bestScore >= 0) {
    const nextRowIndex = bestRow + 1;
    const horizontalMergesOnBestRow = getHorizontalMergeRangesForRow(worksheet, bestRow);

    if (horizontalMergesOnBestRow.length > 0 && nextRowIndex <= (worksheet.rowCount || 0)) {
      const nextRowProfile = getRowProfile(worksheet, nextRowIndex, maxColumns);
      const hasSubHeaderLikeRow =
        nextRowProfile.nonEmpty >= Math.max(2, horizontalMergesOnBestRow.length) &&
        nextRowProfile.unique > 1 &&
        !isLikelyMetadataHeaderRow(nextRowProfile.values);

      if (hasSubHeaderLikeRow) {
        return nextRowIndex;
      }
    }

    return bestRow;
  }

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

    if (isLikelyMetadataHeaderRow(nonEmptyValues)) continue;

    if (
      nonEmpty > fallbackCount ||
      (nonEmpty === fallbackCount &&
        (uniqueValueCount > fallbackUniqueCount ||
          (uniqueValueCount === fallbackUniqueCount && rowIndex < fallbackRow)))
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
  if (
    (groupRowValues.length > 0 && uniqueGroupRowValueCount <= 1) ||
    isLikelyMetadataHeaderRow(groupRowValues)
  ) {
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

    // When the lower header row is blank, this is effectively a single-row header
    // (for example "Item Group Name") and should stay in the second header row only.
    if (!headerLabel) return;

    if (topLabel.toLowerCase() === headerLabel.toLowerCase()) return;

    groups.push({
      label: topLabel,
      startIndex: normalizedIndex,
      endIndex: normalizedIndex,
    });
  });

  const sortedGroups = [...groups].sort((left, right) => left.startIndex - right.startIndex);
  const mergedGroups = [];

  sortedGroups.forEach((group) => {
    const previous = mergedGroups[mergedGroups.length - 1];
    const previousLabel = normalizeTextValue(previous?.label || '').toLowerCase();
    const currentLabel = normalizeTextValue(group?.label || '').toLowerCase();
    const areAdjacent = previous && group.startIndex <= previous.endIndex + 1;

    if (previous && areAdjacent && previousLabel && previousLabel === currentLabel) {
      previous.endIndex = Math.max(previous.endIndex, group.endIndex);
      return;
    }

    mergedGroups.push({ ...group });
  });

  return mergedGroups;
};

const isDuplicateHeaderDataRow = ({ rowEntry, keepColumns, headerLabelsByColumn = [] }) => {
  const rowValues = rowEntry?.values || {};
  const comparableColumns = Math.max(0, Number(keepColumns?.length || 0));

  let nonEmptyCellCount = 0;
  let headerMatchCount = 0;

  keepColumns.forEach((column, index) => {
    const cellValue = normalizeTextValue(rowValues[`c${column}`]);
    if (!cellValue) return;

    nonEmptyCellCount += 1;
    const headerValue = normalizeTextValue(headerLabelsByColumn[index] || '');
    if (headerValue && cellValue.toLowerCase() === headerValue.toLowerCase()) {
      headerMatchCount += 1;
    }
  });

  const minimumMatchCount = Math.min(4, Math.max(2, comparableColumns));
  if (nonEmptyCellCount < minimumMatchCount || headerMatchCount < minimumMatchCount) {
    return false;
  }

  const matchRatio = headerMatchCount / nonEmptyCellCount;
  return matchRatio >= 0.8;
};

const getRowComparableValues = (rowEntry, keepColumns) => {
  const rowValues = rowEntry?.values || {};
  return (keepColumns || [])
    .map((column) => normalizeTextValue(rowValues?.[`c${column}`]))
    .filter(Boolean);
};

const isLikelySecondarySectionHeaderRow = ({
  rowEntry,
  keepColumns,
  previousRows = [],
}) => {
  const comparableValues = getRowComparableValues(rowEntry, keepColumns);
  if (comparableValues.length < 3) return false;

  const joined = comparableValues.join(' ').toLowerCase();
  if (TOTAL_OR_SUMMARY_REGEX.test(joined)) return false;

  const alphaCellCount = comparableValues.filter((value) => /[a-z]/i.test(value)).length;
  const numericCellCount = comparableValues.filter((value) => NUMERIC_TEXT_REGEX.test(value)).length;
  const headerHintCount = comparableValues.filter((value) => HEADER_HINT_REGEX.test(value)).length;

  const alphaRatio = alphaCellCount / comparableValues.length;
  if (alphaRatio < 0.7) return false;

  if (numericCellCount > Math.floor(comparableValues.length * 0.35)) return false;

  if (headerHintCount < 2) return false;

  const previousCombined = previousRows
    .flatMap((candidateRow) => getRowComparableValues(candidateRow, keepColumns))
    .join(' ')
    .toLowerCase();
  const hasBreakContext =
    Number(rowEntry?.blankRowsBefore || 0) > 0 ||
    TOTAL_OR_SUMMARY_REGEX.test(previousCombined);

  if (!hasBreakContext && previousRows.length < 2) return false;

  return true;
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

  const groupRowIndex = headerRowIndex - 1;
  const topHeaderValues = [];
  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    topHeaderValues.push(
      groupRowIndex >= 1 ? getCellDisplayValue(worksheet, groupRowIndex, colIndex) : ''
    );
  }
  const topHeaderNonEmptyValues = topHeaderValues
    .map((value) => normalizeTextValue(value))
    .filter(Boolean);
  const canUseTopHeaderAsFallback =
    groupRowIndex >= 1 &&
    topHeaderNonEmptyValues.length > 0 &&
    new Set(topHeaderNonEmptyValues.map((value) => value.toLowerCase())).size > 1 &&
    !isLikelyMetadataHeaderRow(topHeaderNonEmptyValues);

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

    const blankRowsBefore = blankRowStreak;
    blankRowStreak = 0;
    originalRows.push({
      excelRowIndex: rowIndex,
      blankRowsBefore,
      values: rowObject,
    });
  }

  const keepColumns = [];
  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    const primaryHeader = normalizeTextValue(originalHeaders[colIndex - 1]);
    const fallbackHeader = canUseTopHeaderAsFallback
      ? normalizeTextValue(topHeaderValues[colIndex - 1])
      : '';
    const hasHeader = Boolean(primaryHeader || fallbackHeader);
    const hasMeaningfulData = originalRows.some((row) =>
      isMeaningfulNonZeroDataValue(row?.values?.[`c${colIndex}`])
    );
    if (hasHeader || hasMeaningfulData) keepColumns.push(colIndex);
  }

  const normalizedKeepColumns = keepColumns.length
    ? keepColumns
    : [...Array(maxColumns).keys()].map((index) => index + 1);

  const resolvedHeaderLabels = normalizedKeepColumns.map((originalCol) => {
    const rawLabel = normalizeTextValue(originalHeaders[originalCol - 1]);
    if (rawLabel) return rawLabel;

    if (canUseTopHeaderAsFallback) {
      const fallbackLabel = normalizeTextValue(topHeaderValues[originalCol - 1]);
      if (fallbackLabel) return fallbackLabel;
    }

    return '';
  });

  const headers = normalizedKeepColumns.map((originalCol, normalizedIndex) => {
    const rawLabel = resolvedHeaderLabels[normalizedIndex];
    return {
      key: `c${normalizedIndex + 1}`,
      label: rawLabel || `Column ${normalizedIndex + 1}`,
    };
  });

  const sortedOriginalRows = [...originalRows].sort(
    (left, right) => left.excelRowIndex - right.excelRowIndex
  );

  const rows = sortedOriginalRows
    .map((rowEntry, rowIndex) => {
      const row = rowEntry?.values || {};
      const normalizedRow = {};
      const isDuplicateHeaderRow = isDuplicateHeaderDataRow({
        rowEntry,
        keepColumns: normalizedKeepColumns,
        headerLabelsByColumn: resolvedHeaderLabels,
      });
      const previousRows = sortedOriginalRows.slice(Math.max(0, rowIndex - 3), rowIndex);
      const isSecondarySectionHeaderRow = !isDuplicateHeaderRow &&
        isLikelySecondarySectionHeaderRow({
          rowEntry,
          keepColumns: normalizedKeepColumns,
          previousRows,
        });
      const isSectionHeaderRow = isDuplicateHeaderRow || isSecondarySectionHeaderRow;

      const rowGapSize = isSectionHeaderRow
        ? Math.min(3, Math.max(2, Number(rowEntry?.blankRowsBefore || 0)))
        : 0;

      normalizedKeepColumns.forEach((originalCol, normalizedIndex) => {
        normalizedRow[`c${normalizedIndex + 1}`] = row[`c${originalCol}`] || '';
      });
      normalizedRow.__excelRowIndex = rowEntry.excelRowIndex;
      normalizedRow.__isSectionHeader = isSectionHeaderRow;
      normalizedRow.__sectionGapRows = rowGapSize;
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
