import mongoose from 'mongoose';

const cnc_done_details_schema = new mongoose.Schema(
  {
    
    remark: {
      type: String,
      default: null,
      uppercase: true,
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

// cnc_done_details_schema.index(
//   { issue_for_resizing_id: 1 },
//   { unique: true }
// );

export const plywood_resizing_done_details_model = mongoose.model(
  'cnc_done_details',
  cnc_done_details_schema,
  'cnc_done_details'
);
