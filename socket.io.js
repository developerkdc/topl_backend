import { io } from './index.js';

export function emitProgressUpdate(data) {
  if (!io) {
    console.error('Socket.IO instance is not initialized.');
    return;
  }
  if (io && data?.socketId) {
    console.log(data?.socketId);
    io.to(data?.socketId).emit('progress', {
      fileName: data?.fileName || '',
      progress: data?.progress || 0,
      status: data?.status || null,
      success: {
        status: data?.success?.status || false,
        message: data?.success?.message || null,
      },
      error: {
        status: data?.error?.status || false,
        message: data?.error?.message || null,
      },
      validationErrors: data?.validationErrors || null,
    });
  }
}
