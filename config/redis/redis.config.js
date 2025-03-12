// import Redis from 'ioredis';
// import { Queue, Worker } from 'bullmq';

// const connection = new Redis({
//   host: '127.0.0.1',
//   port: 6379,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
// });

// const myQueue = new Queue('job', { connection });
// const worker = new Worker(
//   'job',
//   async (job) => {
//     console.log(`Job Processing id ${job.name} -> ${job.data.index}`);
//   },
//   { connection, concurrency: 10 }
// );

// worker.on('completed', (job) => {
//   console.log(`Job -> ${job.name} is completed`);
// });

// worker.on('failed', (job) => {
//   console.log(`job failed with id -> ${job.id},`, job);
// });

// const bulkJobs = Array.from({ length: 100 }, (_, i) => ({
//   name: 'jobsjhbvdjj',
//   data: { index: i + 1 },
// }));

// const addBulkJobs = async () => {
//   await myQueue.addBulk(bulkJobs);
//   console.log('Bulk Upload Added successfully');
// };

// export { myQueue, worker, addBulkJobs, connection };
