import mongoose from 'mongoose';

export const approval_status = {
  sendForApproval: {
    status: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
  },
  approved: {
    status: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
  },
  rejected: {
    status: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
  },
};
