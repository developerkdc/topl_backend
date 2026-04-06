import axios from 'axios';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

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
  if (typeof textValue === 'string' && textValue.trim() !== '') {
    return textValue.trim();
  }

  if (rawValue == null) return '';

  if (rawValue instanceof Date) {
    return rawValue.toISOString().split('T')[0];
  }

  if (typeof rawValue === 'object') {
    if (Array.isArray(rawValue.richText)) {
      return rawValue.richText.map((chunk) => chunk?.text || '').join('').trim();
    }
    if (rawValue.text) return String(rawValue.text).trim();
    if (rawValue.result != null) return String(rawValue.result).trim();
    if (rawValue.hyperlink) return String(rawValue.hyperlink).trim();
  }

  return String(rawValue).trim();
};

const getCellDisplayValue = (worksheet, row, col) => {
  const cell = worksheet.getRow(row).getCell(col);
  const directValue = normalizeCellValue(cell.value, cell.text);
  if (directValue) return directValue;

  if (cell.isMerged && cell.master) {
    return normalizeCellValue(cell.master.value, cell.master.text);
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
  const protocol = getProtocol(req);
  const host = req.get('host');
  const apiPrefix = String(req.baseUrl || '').replace(/\/report$/, '');
  const downloadPath = `${apiPrefix}${endpoint}`;
  const requestUrl = `${protocol}://${host}${downloadPath}`;

  return axios.post(requestUrl, payload, {
    timeout: 180000,
    validateStatus: () => true,
    headers: buildForwardHeaders(req.headers),
  });
};

const buildPathCandidates = (pathnameValue) => {
  const workingDir = process.cwd();
  const normalizedPath = String(pathnameValue || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  const candidates = new Set();
  if (!normalizedPath) return [];

  candidates.add(path.resolve(workingDir, normalizedPath));

  if (!normalizedPath.startsWith('public/')) {
    candidates.add(path.resolve(workingDir, 'public', normalizedPath));
  }

  if (normalizedPath.startsWith('public/')) {
    candidates.add(path.resolve(workingDir, normalizedPath));
  }

  if (normalizedPath.startsWith('upload/')) {
    candidates.add(path.resolve(workingDir, normalizedPath));
    candidates.add(path.resolve(workingDir, 'public', normalizedPath));
  }

  if (normalizedPath.startsWith('reports/')) {
    candidates.add(path.resolve(workingDir, 'public', normalizedPath));
  }

  if (normalizedPath.startsWith('public/upload/')) {
    const withoutPublic = normalizedPath.replace(/^public\//, '');
    candidates.add(path.resolve(workingDir, withoutPublic));
  }

  if (normalizedPath.startsWith('public/reports/')) {
    const withoutPublic = normalizedPath.replace(/^public\//, '');
    candidates.add(path.resolve(workingDir, withoutPublic));
  }

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
    let nonEmpty = 0;
    let alphaCount = 0;

    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
      if (!value) continue;
      nonEmpty += 1;
      if (/[A-Za-z]/.test(value)) alphaCount += 1;
    }

    if (nonEmpty < 2) continue;

    const alphaRatio = alphaCount / nonEmpty;
    if (alphaRatio < 0.3) continue;

    const score = alphaCount * 2 + nonEmpty;
    if (score > bestScore || (score === bestScore && rowIndex > bestRow)) {
      bestScore = score;
      bestRow = rowIndex;
    }
  }

  if (bestScore >= 0) return bestRow;

  let fallbackRow = 1;
  let fallbackCount = -1;
  for (let rowIndex = 1; rowIndex <= searchLimit; rowIndex += 1) {
    let nonEmpty = 0;
    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      if (getCellDisplayValue(worksheet, rowIndex, colIndex)) nonEmpty += 1;
    }
    if (nonEmpty > fallbackCount) {
      fallbackCount = nonEmpty;
      fallbackRow = rowIndex;
    }
  }

  return fallbackRow;
};

const extractHeaderGroups = ({ worksheet, headerRowIndex, keepColumns }) => {
  const groupRowIndex = headerRowIndex - 1;
  if (groupRowIndex < 1) return [];

  const merges = worksheet?.model?.merges || [];
  if (!merges.length) return [];

  const columnMap = new Map(keepColumns.map((col, index) => [col, index]));
  const groups = [];

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
      if (value) rowValues.push(value);
    }

    if (rowValues.length === 1) {
      title = rowValues[0];
      break;
    }
  }

  const originalHeaders = [];
  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    originalHeaders.push(getCellDisplayValue(worksheet, headerRowIndex, colIndex));
  }

  const originalRows = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const rowObject = {};
    let hasAnyValue = false;

    for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
      const value = getCellDisplayValue(worksheet, rowIndex, colIndex);
      rowObject[`c${colIndex}`] = value;
      if (value) hasAnyValue = true;
    }

    if (!hasAnyValue) {
      if (originalRows.length > 0) break;
      continue;
    }

    originalRows.push(rowObject);
  }

  const keepColumns = [];
  for (let colIndex = 1; colIndex <= maxColumns; colIndex += 1) {
    const hasHeader = String(originalHeaders[colIndex - 1] || '').trim() !== '';
    const hasRowData = originalRows.some((row) => String(row[`c${colIndex}`] || '').trim() !== '');
    if (hasHeader || hasRowData) keepColumns.push(colIndex);
  }

  const normalizedKeepColumns = keepColumns.length
    ? keepColumns
    : [...Array(maxColumns).keys()].map((index) => index + 1);

  const headers = normalizedKeepColumns.map((originalCol, normalizedIndex) => {
    const rawLabel = String(originalHeaders[originalCol - 1] || '').trim();
    return {
      key: `c${normalizedIndex + 1}`,
      label: rawLabel || `Column ${normalizedIndex + 1}`,
    };
  });

  const rows = originalRows.map((row) => {
    const normalizedRow = {};
    normalizedKeepColumns.forEach((originalCol, normalizedIndex) => {
      normalizedRow[`c${normalizedIndex + 1}`] = row[`c${originalCol}`] || '';
    });
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
