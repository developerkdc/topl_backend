import mongoose from 'mongoose';

const expensesSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    required: [true, 'expense type is required'],
    trim: true,
    uppercase: true,
  },
  expenseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'expense type Id is required'],
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  invoiceNo: {
    type: String,
    default: null,
    uppercase: true,
    trim: true,
  },
  serviceProviderName: {
    type: String,
    default: null,
    uppercase: true,
    trim: true,
  },
  serviceProviderDetails: {
    type: {},
    default: null,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
  },
});

export const approvalExpensesSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    required: [true, 'expense type is required'],
    trim: true,
    uppercase: true,
  },
  expenseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'expense type Id is required'],
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  invoiceNo: {
    type: String,
    default: null,
    uppercase: true,
    trim: true,
  },
  serviceProviderName: {
    type: String,
    default: null,
    uppercase: true,
    trim: true,
  },
  serviceProviderDetails: {
    type: {},
    default: null,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
  },
});

export default expensesSchema;
