import MDBReader from 'mdb-reader';
import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';

export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export const extractDataFromMDBFile = (filePath, tableName) => {
  try {
    console.log(tableName);
    const buffer = fs.readFileSync(filePath);
    const reader = new MDBReader(buffer);

    const data = reader?.getTable(tableName)?.getData();
    console.log('Data extracted from mdb');
    return data;
  } catch (error) {
    console.log('err reading mdf file => ', error);
    throw error;
  }
};

export const start_worker_thread = () => {
  const worker = new Worker(
    path.resolve(`${global?.config?.dirname}/utils/workers/`, 'workers.js')
  );

  worker.on('online', (msg) => {
    console.log(`Worker Thread is live `);
  });
  worker.on('message', (msg) => {
    console.log('Worker Message => ', msg);
  });

  worker.on('error', (err) => {
    console.log('An err occured in workert thread', err);
  });

  worker.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
    if (code != 0) {
      start_worker_thread();
    }
  });
};

export const approval_status = {
  sendForApproval: {
    status: false,
    remark: null,
  },
  approved: {
    status: false,
    remark: null,
  },
  rejected: {
    status: false,
    remark: null,
  },
};



export const format_date = (value) => {
  if (!value) return null;

  // 1. If it's already a Date object (ExcelJS often does this)
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  // 2. If it's a number (Excel Serial Format)
  if (typeof value === 'number' || (!isNaN(value) && !isNaN(parseFloat(value)))) {
    const serial = parseFloat(value);
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial);
    const total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    const minutes = Math.floor(total_seconds / 60) % 60;
    const hours = Math.floor(total_seconds / (60 * 60));
    date_info.setUTCHours(hours, minutes, seconds);
    return date_info;
  }

  // 3. If it's a string (e.g., "13-04-2026" or "2026-04-13")
  if (typeof value === 'string') {
    // Try DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(value.trim());
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1; // JS months are 0-indexed
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Try native parsing for ISO or other standard formats
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}
