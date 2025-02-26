// import { Queue, QueueEvents, Worker } from 'bullmq';
// import { connection } from '../../config/redis/redis.config.js';
// import dressing_raw_machine_data_model from '../../database/schema/factory/dressing/dressing_done/dressing.machine.raw.data.schema.js';
// import ApiError from '../errors/apiError.js';
// import { StatusCodes } from '../constants.js';
// import { get_session } from '../mongo_session_store.js';

// export const dressing_bulk_upload_queue = new Queue('bulk_upload_queue', {
//   connection: connection,
// });
// export const dressing_bulk_upload_queue_events = new QueueEvents(
//   'bulk_upload_queue',
//   { connection: connection }
// );

// const createWorkers = (workerCount) => {
//   for (let i = 0; i < workerCount; i++) {
//     new Worker(
//       'bulk_upload_queue',
//       async (job) => {
//         try {
//           const batch_data = job?.data?.data;

//           // const session_id = job?.data?.session;

//           // if (!session_id) {
//           //   throw new ApiError('Session is missing', StatusCodes?.BAD_REQUEST);
//           // }
//           // const session = get_session(session_id);

//           // if (!session) {
//           //   throw new ApiError("Session not found", StatusCodes?.NOT_FOUND)
//           // }
//           await dressing_raw_machine_data_model.insertMany(batch_data, {
//             ordered: false,
//           });

//           console.log('Job Completed Successfully');
//         } catch (error) {
//           console.log(`Worker ${i + 1} failed to upload batch:`, error.message);
//           throw error;
//         }
//       },
//       { connection: connection, concurrency: 8 }
//     );
//   }
// };

// createWorkers(5);

// dressing_bulk_upload_queue_events.on('completed', (job) => {
//   console.log(`Bulk Upload Completed - Job ID: ${job.jobId}`);
// });

// dressing_bulk_upload_queue_events.on('failed', (job, err) => {
//   console.log(
//     `An error occurred in bulk upload - Job ID: ${job.jobId}, Error: ${job.failedReason}`
//   );
// });
