import mongoose from 'mongoose';

const dressing_done_history_schema = new mongoose.Schema(
  {
    dressing_done_other_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Dressing Done other details ID is required.'],
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

const dressing_done_history_model = mongoose.model(
  'dressing_done_history',
  dressing_done_history_schema,
  'dressing_done_history'
);

export default dressing_done_history_model;
