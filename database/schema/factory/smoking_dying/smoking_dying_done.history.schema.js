import mongoose from 'mongoose';

const process_done_history_schema = new mongoose.Schema(
  {
    process_done_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Process Done ID is required.'],
    },
    bundles: {
      type: [mongoose.Schema.Types.ObjectId],
      required: [true, 'Bundles Array is required'],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By is required.'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By is required.'],
    },
  },
  { timestamps: true }
);

const process_done_history_model = mongoose.model(
  'process_done_history',
  process_done_history_schema,
  'process_done_history'
);

export default process_done_history_model;
