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
  }
}