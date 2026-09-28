import mongoose from 'mongoose';

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
  'locked_fields',
  'pressing_records',
  'dispatch_records',
]);

const comparableValue = (value) => JSON.stringify(value ?? null);

export const findProcessLockedItemIds = async (itemIds, session) => {
  const ids = itemIds?.filter(Boolean) || [];
  if (!ids.length || !mongoose?.connection?.db) return new Set();

  const records = await Promise.all(
    PROCESS_ISSUE_COLLECTIONS.map((collectionName) =>
      mongoose.connection.db
        .collection(collectionName)
        .find(
          { order_item_id: { $in: ids } },
          { projection: { order_item_id: 1 }, session }
        )
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

export const hasProcessLockedItemChanged = (existingItem, incomingItem) => {
  const existing = existingItem?.toObject
    ? existingItem.toObject()
    : existingItem || {};
  const incoming = incomingItem || {};
  // The edit form may intentionally omit server-managed fields. Compare only
  // fields sent by the client, while ignoring the process metadata added by
  // the edit endpoint.
  const fields = Object.keys(incoming);

  return [...fields].some(
    (field) =>
      !PROCESS_LOCK_METADATA_FIELDS.has(field) &&
      comparableValue(existing[field]) !== comparableValue(incoming[field])
  );
};

export const getProcessLockedItemError = (item) =>
  `Cannot edit or delete item ${item?.item_no || ''} because it has already been issued for processing.`;
