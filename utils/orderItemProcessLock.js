import mongoose from 'mongoose';
import ApiError from './errors/apiError.js';
import { StatusCodes } from './constants.js';

export const PROCESS_ISSUE_COLLECTIONS = [
  'issued_for_order_items',
  'issues_for_pressings',
  'issued_for_slicings',
  'issues_for_peelings',
  'issue_for_dressing',
  'issues_for_groupings',
  'issues_for_crosscuttings',
  'issues_for_flitchings',
  'issued_for_cnc_details',
  'issued_for_color_details',
  'issued_for_bunito_details',
  'issued_for_canvas_details',
  'issued_for_polishing_details',
  'issue_for_tappings',
  'finished_ready_for_packing_details',
  'dispatch_items',
];

/** Factory veneer bundle collection — no order_item_id; not used for order line grouping locks. */
export const GROUPING_ISSUE_COLLECTION = 'issues_for_groupings';

export const GROUPING_DONE_HISTORY_COLLECTION = 'grouping_done_history';
export const ISSUE_FOR_TAPPINGS_COLLECTION = 'issue_for_tappings';
export const ISSUED_FOR_ORDER_ITEMS_COLLECTION = 'issued_for_order_items';
export const GROUPING_FACTORY_ISSUED_FROM = 'GROUPING_FACTORY';

const ISSUE_FOR_TAPPINGS_PROCESS_INDEX = PROCESS_ISSUE_COLLECTIONS.indexOf(
  ISSUE_FOR_TAPPINGS_COLLECTION
);

const uniqueFields = (fields) => [...new Set(fields)];

/** Locked after grouping is done (issues_for_groupings). */
const GROUPING_DONE_LOCKED_FIELDS_COMMON = [
  'photo_number',
  'photo_number_id',
  'additional_photo_number',
  'group_number',
  'group_number_id',
  'item_sub_category_name',
  'item_sub_category_id',
  'item_name',
  'item_name_id',
];

/** After grouping done (series product order lines). */
const SERIES_GROUPING_DONE_LOCKED_FIELDS = uniqueFields([
  'dispatch_schedule',
  'product_code',
  'product_id',
  'photo_number',
  'photo_number_id',
  'additional_photo_number',
  'group_number',
  'group_number_id',
  'series_name',
  'series_name_id',
  'item_sub_category_name',
  'item_sub_category_id',
  'item_name',
  'item_name_id',
]);

const DECORATIVE_GROUPING_DONE_LOCKED_FIELDS = uniqueFields([
  ...GROUPING_DONE_LOCKED_FIELDS_COMMON,
  'series_name',
  'series_name_id',
]);

/** After pressing done (series). */
const SERIES_PRESSING_DONE_LOCKED_FIELDS = uniqueFields([
  'product_code',
  'color_code',
  'base_size',
  'length',
  'width',
  'no_of_hours',
  'thickness',
  'no_of_sheets',
  'sqm',
  'sq_feet',
  'veneer_min_thickness',
  'pressing_instructions',
  'base_type',
  'base_sub_category_id',
  'base_sub_category_name',
  'base_min_thickness',
  'base_required_sheet',
  'flow_process',
  'polish_type',
]);

/** After dispatch created (series). */
const SERIES_DISPATCH_LOCKED_FIELDS = uniqueFields([
  'value_added_process',
  'sales_item_name',
  'alternate_sales_item_name',
  'previous_rate',
  'rate_per_sq_feet',
  'rate',
  'amount',
  'dispatch_no_of_sheets',
  'remark',
]);

/** After pressing done (decorative). */
const DECORATIVE_PRESSING_DONE_LOCKED_FIELDS = uniqueFields([
  'length',
  'width',
  'sqm',
  'photo_number',
  'photo_number_id',
  'group_number',
  'group_number_id',
  'different_group_photo_number',
  'different_group_photo_number_id',
  'different_group_group_number',
  'different_group_group_number_id',
  'different_thickness',
  'different_thickness_id',
  'thickness',
  'no_of_sheets',
  'pressing_instructions',
  'base_type',
  'base_sub_category_id',
  'base_sub_category_name',
  'base_min_thickness',
  'value_added_process',
]);

/** After dispatch created (decorative). */
const DECORATIVE_DISPATCH_LOCKED_FIELDS = [
  'sales_item_name',
  'alternate_sales_item_name',
  'previous_rate',
  'rate_per_sqm',
  'amount',
  'remark',
];

export const ORDER_ITEM_LOCK_FIELD_SETS = {
  series: {
    groupingDone: SERIES_GROUPING_DONE_LOCKED_FIELDS,
    base: SERIES_PRESSING_DONE_LOCKED_FIELDS,
    invoice: SERIES_DISPATCH_LOCKED_FIELDS,
  },
  decorative: {
    groupingDone: DECORATIVE_GROUPING_DONE_LOCKED_FIELDS,
    base: DECORATIVE_PRESSING_DONE_LOCKED_FIELDS,
    invoice: DECORATIVE_DISPATCH_LOCKED_FIELDS,
  },
};

export const buildOrderItemLockedFields = (item, orderType) => {
  const sets = ORDER_ITEM_LOCK_FIELD_SETS[orderType];
  if (!sets) return [];

  const locked = [];
  if (item?.has_grouping_issue) {
    locked.push(...sets.groupingDone);
  }
  if (item?.is_pressed) {
    locked.push(...sets.base);
  }
  if (item?.is_dispatched) {
    locked.push(...sets.invoice);
  }
  return uniqueFields(locked);
};

const PROCESS_LOCK_METADATA_FIELDS = new Set([
  '_id',
  '__v',
  'order_id',
  'product_category',
  'created_by',
  'updated_by',
  'createdAt',
  'updatedAt',
  'is_pressed',
  'is_dispatched',
  'is_issued',
  'has_grouping_issue',
  'locked_fields',
  'pressing_records',
  'dispatch_records',
]);

const comparableValue = (value) => JSON.stringify(value ?? null);

const hasFieldChanged = (existing, incoming, field) => {
  const a = existing?.[field];
  const b = incoming?.[field];
  return comparableValue(a) !== comparableValue(b);
};

export const findGroupingLockedItemIds = async (itemIds, session) => {
  void session;
  const ids = itemIds?.filter(Boolean) || [];
  if (!ids.length || !mongoose?.connection?.db) return new Set();

  const db = mongoose.connection.db;
  const [historyRecords, tappingRecords, groupingFactoryIssues] =
    await Promise.all([
      db
        .collection(GROUPING_DONE_HISTORY_COLLECTION)
        .find({ order_item_id: { $in: ids } }, { projection: { order_item_id: 1 } })
        .toArray(),
      db
        .collection(ISSUE_FOR_TAPPINGS_COLLECTION)
        .find({ order_item_id: { $in: ids } }, { projection: { order_item_id: 1 } })
        .toArray(),
      db
        .collection(ISSUED_FOR_ORDER_ITEMS_COLLECTION)
        .find(
          {
            order_item_id: { $in: ids },
            issued_from: GROUPING_FACTORY_ISSUED_FROM,
          },
          { projection: { order_item_id: 1 } }
        )
        .toArray(),
    ]);

  return new Set(
    [...historyRecords, ...tappingRecords, ...groupingFactoryIssues]
      .map((record) => record?.order_item_id?.toString())
      .filter(Boolean)
  );
};

/** Extra $lookup stages (run on each order line item before process status $addFields). */
export const orderItemGroupingDoneLookups = () => [
  {
    $lookup: {
      from: GROUPING_DONE_HISTORY_COLLECTION,
      localField: '_id',
      foreignField: 'order_item_id',
      as: 'grouping_done_history_records',
    },
  },
  {
    $lookup: {
      from: ISSUED_FOR_ORDER_ITEMS_COLLECTION,
      let: { orderItemId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$order_item_id', '$$orderItemId'] },
                { $eq: ['$issued_from', GROUPING_FACTORY_ISSUED_FROM] },
              ],
            },
          },
        },
        { $project: { _id: 1 } },
      ],
      as: 'grouping_factory_issued_order_records',
    },
  },
];

export const orderItemGroupingDoneProjectHide = {
  grouping_done_history_records: 0,
  grouping_factory_issued_order_records: 0,
};

/**
 * Read-only check: which order item ids appear in any factory issue collection.
 */
export const findProcessLockedItemIds = async (itemIds, session) => {
  void session;
  const ids = itemIds?.filter(Boolean) || [];
  if (!ids.length || !mongoose?.connection?.db) return new Set();

  const records = await Promise.all(
    PROCESS_ISSUE_COLLECTIONS.map((collectionName) =>
      mongoose.connection.db
        .collection(collectionName)
        .find({ order_item_id: { $in: ids } }, { projection: { order_item_id: 1 } })
        .toArray()
    )
  );

  return new Set(
    records
      .flat()
      .map((record) => record?.order_item_id?.toString())
      .filter(Boolean)
  );
};

export const assertOrderItemFieldsEditable = async ({
  orderType,
  existingItem,
  incomingItem,
  session,
  pressingDoneModel,
  dispatchItemsModel,
}) => {
  const sets = ORDER_ITEM_LOCK_FIELD_SETS[orderType];
  if (!sets) return;

  if (orderType === 'decorative' || orderType === 'series') {
    const dispatchRecord = await dispatchItemsModel.findOne(
      { order_item_id: existingItem._id },
      { _id: 1 },
      { session }
    );
    if (dispatchRecord && hasProcessLockedItemChanged(existingItem, incomingItem)) {
      throw new ApiError(
        `Cannot edit item ${existingItem.item_no} — item has already been dispatched.`,
        StatusCodes.BAD_REQUEST
      );
    }
  }

  const changedGroupingFields = sets.groupingDone.filter((f) =>
    hasFieldChanged(existingItem, incomingItem, f)
  );
  const changedBaseFields = sets.base.filter((f) =>
    hasFieldChanged(existingItem, incomingItem, f)
  );
  const changedInvoiceFields = sets.invoice.filter((f) =>
    hasFieldChanged(existingItem, incomingItem, f)
  );

  if (
    changedGroupingFields.length === 0 &&
    changedBaseFields.length === 0 &&
    changedInvoiceFields.length === 0
  ) {
    return;
  }

  const [groupingLockedItemIds, pressingRecord, dispatchRecord] = await Promise.all([
    changedGroupingFields.length
      ? findGroupingLockedItemIds([existingItem._id], session)
      : new Set(),
    changedBaseFields.length
      ? pressingDoneModel.findOne(
          { order_item_id: existingItem._id },
          { _id: 1 },
          { session }
        )
      : null,
    changedInvoiceFields.length
      ? dispatchItemsModel.findOne(
          { order_item_id: existingItem._id },
          { _id: 1 },
          { session }
        )
      : null,
  ]);

  if (
    changedGroupingFields.length &&
    groupingLockedItemIds.has(String(existingItem._id))
  ) {
    throw new ApiError(
      `Cannot edit ${changedGroupingFields.join(', ')} for item ${existingItem.item_no} — grouping has already been done.`,
      StatusCodes.BAD_REQUEST
    );
  }

  if (changedBaseFields.length && pressingRecord) {
    throw new ApiError(
      `Cannot edit ${changedBaseFields.join(', ')} for item ${existingItem.item_no} — item has already been pressed.`,
      StatusCodes.BAD_REQUEST
    );
  }

  if (changedInvoiceFields.length && dispatchRecord) {
    throw new ApiError(
      `Cannot edit ${changedInvoiceFields.join(', ')} for item ${existingItem.item_no} — item has already been dispatched.`,
      StatusCodes.BAD_REQUEST
    );
  }
};

export const hasProcessLockedItemChanged = (existingItem, incomingItem) => {
  const existing = existingItem?.toObject
    ? existingItem.toObject()
    : existingItem || {};
  const incoming = incomingItem || {};
  const fields = Object.keys(incoming);

  return [...fields].some(
    (field) =>
      !PROCESS_LOCK_METADATA_FIELDS.has(field) &&
      comparableValue(existing[field]) !== comparableValue(incoming[field])
  );
};

export const getProcessLockedItemError = (item) =>
  `Cannot edit or delete item ${item?.item_no || ''} because it has already been issued for processing.`;

/** Aggregation $addFields for process flags on order line items. */
export const orderItemProcessStatusAddFields = () => ({
  is_pressed: { $gt: [{ $size: '$pressing_records' }, 0] },
  is_dispatched: { $gt: [{ $size: '$dispatch_records' }, 0] },
  has_grouping_issue: {
    $or: [
      { $gt: [{ $size: '$grouping_done_history_records' }, 0] },
      { $gt: [{ $size: '$grouping_factory_issued_order_records' }, 0] },
      ...(ISSUE_FOR_TAPPINGS_PROCESS_INDEX >= 0
        ? [
            {
              $gt: [
                {
                  $size: `$process_issue_records_${ISSUE_FOR_TAPPINGS_PROCESS_INDEX}`,
                },
                0,
              ],
            },
          ]
        : []),
    ],
  },
  is_issued: {
    $or: [
      { $gt: [{ $size: '$pressing_records' }, 0] },
      { $gt: [{ $size: '$dispatch_records' }, 0] },
      ...PROCESS_ISSUE_COLLECTIONS.map((_, index) => ({
        $gt: [{ $size: `$process_issue_records_${index}` }, 0],
      })),
    ],
  },
});
