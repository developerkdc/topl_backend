import mongoose from 'mongoose';
import {
  base_type_constants,
  consumed_from_constants,
  issues_for_status,
  order_category,
} from '../../../../Utils/constants/constants.js';

const validateOrderField = function () {
  return this.issue_status === issues_for_status?.order ? true : false;
};

const pressing_done_details_schema = new mongoose.Schema(
  {
    pressing_date: {
      type: Date,
      required: [true, 'Pressing Date is required'],
    },
    // issue_for_pressing_item_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   required: [true, 'issue for pressing id is required'],
    // },
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
    isEditable: {
      type: Boolean,
      default: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [validateOrderField, 'order_id is required'],
    },
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      required: [validateOrderField, 'order_item_id is required'],
    },
    order_category: {
      type: String,
      enum: {
        values: [order_category.decorative, order_category.series_product],
        message: `Invalid type {{VALUE}} it must be one of the ${order_category.decorative},${order_category.series_product}`,
      },
      uppercase: true,
      trim: true,
      default: null,
      required: [validateOrderField, 'order_category is required'],
    },
    issue_status: {
      type: String,
      enum: {
        values: [
          issues_for_status.order,
          issues_for_status.stock,
          issues_for_status.sample,
        ],
        message: `Invalid type {{VALUE}} it must be one of the ${(issues_for_status.order, issues_for_status.stock, issues_for_status.sample)}`,
      },
      default: null,
    },
    machine_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Machine id is required'],
    },
    machine_name: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true,
      uppercase: true,
    },
    group_no: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Group No is required'],
    },
    group_no_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Group No Id id is required'],
    },
    group_no_array: {
      type: Array,
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'group_no_array must contain at least one element',
      },
    },
    product_type: {
      type: String,
      required: [true, 'Product Type is required'],
      trim: true,
    },
    series_product_code: {
      type: String,
      default: null,
      trim: true,
    },
    pressing_instructions: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    pressing_id: {
      type: String,
      required: [true, 'Pressing Id is required'],
      trim: true,
      uppercase: true,
    },
    length: {
      type: Number,
      default: 0,
      required: [true, 'Length is required'],
    },
    width: {
      type: Number,
      default: 0,
      required: [true, 'Width is required'],
    },
    base_thickness: {
      type: Number,
      default: 0,
      required: [true, 'Base Thickness is required'],
    },
    veneer_thickness: {
      type: Number,
      default: 0,
      required: [true, 'Veneer Thickness is required'],
    },
    thickness: {
      type: Number,
      default: 0,
      required: [true, 'Thickness is required'],
    },
    no_of_sheets: {
      type: Number,
      default: 0,
      required: [true, 'No of leaves is required'],
    },
    sqm: {
      type: Number,
      default: 0,
      required: [true, 'SQM is required'],
    },
    amount: {
      type: Number,
      default: 0,
      required: [true, 'Item Amount is required'],
    },
    available_details: {
      no_of_sheets: {
        type: Number,
        default: function () {
          return this.no_of_sheets;
        },
      },
      sqm: {
        type: Number,
        default: function () {
          return this.sqm;
        },
      },
      amount: {
        type: Number,
        default: function () {
          return this.amount;
        },
      },
    },
    flow_process: [
      {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
      },
    ],
    remark: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
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
  {
    timestamps: true,
  }
);

// indexing
const indexingFields = [
  [{ issue_for_pressing_item_id: 1 }],
  [{ pressing_date: 1 }],
  [{ isEditable: 1 }],
  [{ order_id: 1 }],
  [{ group_no: 1 }],
  [{ pressing_id: 1, unique: true }],
  [{ 'available_details.no_of_sheets': 1 }],
  [{ 'available_details.sqm': 1 }],
  [{ 'available_details.amount': 1 }],
  [{ flow_process: 1 }],
  [{ created_by: 1 }],
  [{ updatedAt: 1 }],
];

indexingFields.forEach((index) => pressing_done_details_schema.index(...index));

export const pressing_done_details_model = mongoose.model(
  'pressing_done_details',
  pressing_done_details_schema,
  'pressing_done_details'
);

function validateConsumedFrom(value) {
  const baseType = this.base_type;

  if (!baseType) return true; // Skip if base_type not set yet

  const allowedForPlywood = [
    consumed_from_constants.inventory,
    consumed_from_constants.production,
    consumed_from_constants.resizing,
  ];

  if (baseType === base_type_constants.plywood) {
    return allowedForPlywood.includes(value);
  }

  if (baseType === base_type_constants.mdf || baseType === base_type_constants.fleece_paper) {
    return value === consumed_from_constants.inventory;
  }

  return false;
}

const pressing_done_consumed_items_details_schema = new mongoose.Schema(
  {
    pressing_done_details_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Pressing done id is required'],
    },
    group_details: [
      {
        issue_for_pressing_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'pressing_done_details',
          required: true,
        },
        group_no_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        group_no: {
          type: String,
          uppercase: true,
          trim: true,
          required: [true, 'Group No is required'],
        },
        item_name: {
          type: String,
          uppercase: true,
          trim: true,
          required: [true, 'Item Name is required'],
        },
        item_name_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Item Name ID is required'],
        },
        item_sub_category_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Items Sub-Category Id is required'],
        },
        item_sub_category_name: {
          type: String,
          required: [true, 'Item Sub-Category Name is required'],
          trim: true,
          uppercase: true,
        },
        log_no_code: {
          type: String,
          uppercase: true,
          trim: true,
          required: [true, 'Log No Code is required'],
        },
        length: {
          type: Number,
          default: 0,
          required: [true, 'Length is required'],
        },
        width: {
          type: Number,
          default: 0,
          required: [true, 'Width is required'],
        },
        thickness: {
          type: Number,
          default: 0,
          required: [true, 'Width is required'],
        },
        no_of_sheets: {
          type: Number,
          default: 0,
          required: [true, 'No of leaves is required'],
        },
        sqm: {
          type: Number,
          default: 0,
          required: [true, 'SQM is required'],
        },
        amount: {
          type: Number,
          default: 0,
          required: [true, 'Item Amount is required'],
        },
      },
    ],
    base_details: [
      {
        base_type: {
          type: String,
          required: [true, 'Base Type is required'],
          enum: {
            values: [base_type_constants.plywood, base_type_constants.mdf, base_type_constants.fleece_paper],
            message: `Invalid type {{VALUE}} it must be one of the ${[base_type_constants.plywood, base_type_constants.mdf, base_type_constants.fleece_paper]}`,
          },
        },

        consumed_from: {
          type: String,
          enum: {
            values: [
              consumed_from_constants.inventory,
              consumed_from_constants.production,
              consumed_from_constants.resizing,
            ],
            message: `Invalid type {{VALUE}} it must be one of the ${[consumed_from_constants.inventory, consumed_from_constants.production, consumed_from_constants.resizing, consumed_from_constants.factory]}`,
          },
          validate: {
            validator: validateConsumedFrom,
            message: function (props) {
              if (
                this.base_type === base_type_constants.mdf ||
                this.base_type === base_type_constants.fleece_paper
              ) {
                return `'${props.value}' is not allowed when base_type is '${this.base_type}'. Only ${consumed_from_constants.inventory} is allowed.`;
              }
              return `'${props.value}' is not valid for base_type '${this.base_type}'`;
            },
          },

          default: consumed_from_constants.inventory,
        },
        consumed_from_item_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Consumed From Item Id is required'],
        },
        item_name: {
          type: String,
          uppercase: true,
          trim: true,
          required: [true, 'Item Name is required'],
        },
        item_name_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Item Name ID is required'],
        },
        item_sub_category_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Items Sub-Category Id is required'],
        },
        item_sub_category_name: {
          type: String,
          required: [true, 'Item Sub-Category Name is required'],
          trim: true,
          uppercase: true,
        },
        pallet_no: {
          type: String,
          uppercase: true,
          trim: true,
          required: [
            // requiredOnBaseType(base_type.plywood) ||
            //   requiredOnBaseType(base_type.mdf),
            function () {
              return this.base_type === base_type_constants.plywood ||
                this.base_type === base_type_constants.mdf
                ? true
                : false;
            },
            'Pallet No is required.',
          ],
        },

        length: {
          type: Number,
          default: 0,
          required: [true, 'Length is required'],
        },
        width: {
          type: Number,
          default: 0,
          required: [true, 'Width is required'],
        },
        thickness: {
          type: Number,
          default: 0,
          required: [true, 'Thickness is required'],
        },
        no_of_sheets: {
          type: Number,
          default: 0,
          required: [
            // requiredOnBaseType(base_type.plywood) ||
            //   requiredOnBaseType(base_type.mdf),
            function () {
              return this.base_type === base_type_constants.plywood ||
                this.base_type === base_type_constants.mdf
                ? true
                : false;
            },
            'Number of Roll is required',
          ],
        },
        number_of_roll: {
          type: Number,
          default: 0,
          required: [
            // requiredOnBaseType(base_type.fleece_paper),
            function () {
              return this.base_type === base_type_constants.fleece_paper ? true : false;
            },
            'Number of Roll is required',
          ],
        },
        sqm: {
          type: Number,
          default: 0,
          required: [true, 'SQM is required'],
        },
        amount: {
          type: Number,
          default: 0,
          required: [true, 'Item Amount is required'],
        },

        inward_sr_no: {
          // fleece paper inward sr no
          type: Number,
          default: null,
          required: [
            // requiredOnBaseType(base_type.fleece_paper),
            function () {
              return this.base_type === base_type_constants.fleece_paper ? true : false;
            },
            'Inward Sr No is required for Fleece Paper',
          ],
        },
        item_sr_no: {
          //fleece paper item sr no
          type: Number,
          default: null,
          required: [
            // requiredOnBaseType(base_type.fleece_paper),
            function () {
              return this.base_type === base_type_constants.fleece_paper ? true : false;
            },
            'Item Sr No is required for Fleece Paper.',
          ],
        },
      },
    ],

    face_details: [
      {
        consumed_from: {
          type: String,
          enum: {
            values: [consumed_from_constants.inventory, consumed_from_constants.factory],
            message: `Invalid type {{VALUE}} it must be one of the ${[
              consumed_from_constants.inventory,
              consumed_from_constants.factory,
            ]}`,
          },
          default: consumed_from_constants.inventory,
        },
        consumed_from_item_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Consumed From Item Id is required'],
        },

        inward_sr_no: {
          type: Number,
          default: null,
          required: [true, 'Inward Sr No is required for Fleece Paper'],
        },
        item_sr_no: {
          type: Number,
          default: null,
          required: [true, 'Item Sr No is required for Fleece Paper.'],
        },
        item_name: {
          type: String,
          uppercase: true,
          trim: true,
          required: [true, 'Item Name is required'],
        },
        item_name_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Item Name ID is required'],
        },
        item_sub_category_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Items Sub-Category Id is required'],
        },
        item_sub_category_name: {
          type: String,
          required: [true, 'Item Sub-Category Name is required'],
          trim: true,
          uppercase: true,
        },
        length: {
          type: Number,
          default: 0,
          required: [true, 'Length is required'],
        },
        width: {
          type: Number,
          default: 0,
          required: [true, 'Width is required'],
        },
        thickness: {
          type: Number,
          default: 0,
          required: [true, 'Thickness is required'],
        },
        no_of_sheets: {
          type: Number,
          default: 0,
          required: [true, 'Number of Roll is required'],
        },
        sqm: {
          type: Number,
          default: 0,
          required: [true, 'SQM is required'],
        },
        amount: {
          type: Number,
          default: 0,
          required: [true, 'Item Amount is required'],
        },
      },
    ],

    created_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Created By is required'],
      trim: true,
    },
    updated_by: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: [true, 'Updated By is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// function requiredOnBaseType(base) {
//   return this.base_type === base ? true : false;
// }

export const pressing_done_consumed_items_details_model = mongoose.model(
  'pressing_done_consumed_items_details',
  pressing_done_consumed_items_details_schema,
  'pressing_done_consumed_items_details'
);
