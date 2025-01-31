import mongoose from 'mongoose';
import { slicing_done } from '../../../Utils/constants/constants.js';

const slicing_done_other_details_schema = new mongoose.Schema(
  {
    issue_for_slicing_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'issue for slicing id is required'],
    },
    slicing_date: {
      type: Date,
      required: [true, 'Slicing Date is required'],
    },
    no_of_workers: {
      type: Number,
      required: [true, 'No.of Workers is required '],
    },
    no_of_working_hours: {
      type: Number,
      required: [true, 'No. of Working hours is required'],
    },
    no_of_total_hours: {
      type: Number,
      required: [true, 'No. of Total hours is required'],
    },
    shift: {
      type: String,
      required: [true, 'Shift is required'],
      trim: true,
      uppercase: true,
    },

    // wastage_details: {
    //   type: {
    //     height: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Wastage Height is required.'],
    //     },
    //     width: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Wastage Width is required.'],
    //     },
    //     length: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Wastage Length is required.'],
    //     },
    //     cmt: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Wastage CMT is required.'],
    //     },
    //     total_wastage_amount: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Total Wastage Amount is required.'],
    //     },
    //     wastage_consumed_amount: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Wastage Consumed Amount is required.'],
    //     },
    //   },
    //   required: [
    //     function () {
    //       return this.type === slicing_done.wastage;
    //     },
    //     'Wastage Details is required.',
    //   ],
    // },
    // available_details: {
    //   type: {
    //     height: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Available Height is required.'],
    //     },
    //     width: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Available Width is required.'],
    //     },
    //     length: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Available Length is required.'],
    //     },
    //     cmt: {
    //       type: Number,
    //       default: 0,
    //       required: [true, 'Available CMT is required.'],
    //     },
    //   },
    //   required: [
    //     function () {
    //       return this.type === slicing_done.rest_roller;
    //     },
    //     'Available Details is required.',
    //   ],
    // },
    wastage_consumed_total_amount: {
      type: Number,
      default: 0,
      required: [
        function () {
          return this.type === slicing_done.wastage;
        },
        'Wastage Consumed Total Amount is required.',
      ],
    },
    remark: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Created By Id is required'],
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Updated By Id is required'],
    },
  },
  { timestamps: true }
);

slicing_done_other_details_schema.index({ type: 1 });

export const slicing_done_other_details_model = mongoose.model(
  'slicing_done_other_details',
  slicing_done_other_details_schema,
  'slicing_done_other_details'
);

const slicing_done_items_schema = new mongoose.Schema({
  sr_no: {
    type: Number,
    required: [true, 'Sr No. is required'],
  },
  slicing_done_other_details_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'slicing_done_other_details',
    required: [true, 'Slicing Done other details id is required'],
  },
  item_name: {
    type: String,
    required: [true, 'Item Name is required'],
  },
  item_name_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item Name ID is required'],
  },
  log_no_code: {
    type: String,
    required: [true, 'Log No Code is required'],
  },
  flitch_no: {
    type: String,
    required: [true, 'Flitch No is required'],
  },
  flitch_side: {
    type: String,
    required: [true, 'Flitch Side is required'],
  },
  length: {
    type: Number,
    required: [true, 'Length is required'],
  },
  width: {
    type: Number,
    required: [true, 'Width is required'],
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
  },
  thickness: {
    type: Number,
    required: [true, 'Thickness is required'],
  },
  no_of_leaves: {
    type: Number,
    required: [true, 'No of leaves is required'],
  },
  cmt: {
    type: Number,
    required: [true, 'CMT is required'],
  },

  color_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  color_name: {
    type: String,
    default: null,
  },

  character_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Charcter ID is required'],
  },
  character_name: {
    type: String,
    required: [true, 'Charcter Name is required'],
  },
  pattern_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Pattern ID is required'],
  },
  pattern_name: {
    type: String,
    required: [true, 'Pattern Name is required'],
  },
  series_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Series ID is required'],
  },
  series_name: {
    type: String,
    required: [true, 'Series Name is required'],
  },
  grade_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Grade ID is required'],
  },
  grade_name: {
    type: String,
    required: [true, 'Grade Name is required'],
  },
  issued_for_dressing: {
    type: Boolean,
    default: false,
  },
  item_total_amount: {
    type: Number,
    required: [true, 'Total Amount is required'],
  },
  item_wastage_consumed_amount: {
    type: Number,
    default: 0,
  },
  remark: {
    type: String,
    default: null,
  },
});

export const slicing_done_items_model = mongoose.model(
  'slicing_done_items',
  slicing_done_items_schema,
  'slicing_done_items'
);

const slicing_done_view_schema = new mongoose.Schema(
  {},
  { autoCreate: false, autoIndex: false, strict: false }
);

export const slicing_done_item_view_model = mongoose.model(
  'slicing_done_item_view',
  slicing_done_view_schema,
  'slicing_done_item_view'
);

(async function () {
  await slicing_done_item_view_model.createCollection({
    viewOn: 'slicing_done_items',
    pipeline: [
      {
        $sort: {
          updatedAt: -1,
          _id: -1,
        },
      },
      {
        $lookup: {
          from: 'slicing_done_other_details',
          localField: 'slicing_done_other_details_id',
          foriegnField: '_id',
          as: 'slicingDoneOtherDetails',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foriegnField: '_id',
          as: 'createdUserDetails',
          pipeline: [
            {
              $project: {
                user_name: 1,
                user_type: 1,
                dept_name: 1,
                first_name: 1,
                last_name: 1,
                email_id: 1,
                mobile_no: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'updated_by',
          foriegnField: '_id',
          as: 'updatedUserDetails',
          pipeline: [
            {
              $project: {
                user_name: 1,
                user_type: 1,
                dept_name: 1,
                first_name: 1,
                last_name: 1,
                email_id: 1,
                mobile_no: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$slicingDoneOtherDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$createdUserDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$updatedUserDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
  });
})();

const slicingDoneItems = [
  {
    slicing_done_other_details_id: '6721e0b93581302f31ef55e0',
    item_name: 'AMERICAN WHITE OAK',
    item_name_id: '66e7ca5a33d6b19a8a355c9b',
    log_no_code: '11',
    flitch_no: '1',
    flitch_side: 'TQF',
    length: 10,
    width: 1,
    height: 1,
    thickness: 1,
    no_of_leaves: 10,
    character_id: '6788b8c81389e179f959132e',
    character_name: 'OLIVE',
    pattern_id: '6788e8da88cb1777cc6cf4d7',
    pattern_name: 'PATTERN NO.1',
    series_id: '66e7d21c3a51fb04ddfc4eb0',
    series_name: 'AB',
    grade_id: '66e7ede088066630aacdf501',
    grade_name: 'A',
    item_total_amount: 250,
    item_wastage_consumed_amount: 0,
    remark: 'Test Data',
  },
  {
    slicing_done_other_details_id: '6721e0b93581302f31ef55e0',
    item_name: 'AMERICAN WHITE OAK',
    item_name_id: '66e7ca5a33d6b19a8a355c9b',
    log_no_code: '11',
    flitch_no: '1',
    flitch_side: 'TQF',
    length: 10,
    width: 1,
    height: 1,
    thickness: 10,
    no_of_leaves: 10,
    character_id: '6788b8c81389e179f959132e',
    character_name: 'OLIVE',
    pattern_id: '6788e8da88cb1777cc6cf4d7',
    pattern_name: 'PATTERN NO.1',
    series_id: '66e7d21c3a51fb04ddfc4eb0',
    series_name: 'AB',
    grade_id: '66e7ede088066630aacdf501',
    grade_name: 'A',
    item_total_amount: 250,
    item_wastage_consumed_amount: 0,
    remark: 'Test Data',
  },
];
