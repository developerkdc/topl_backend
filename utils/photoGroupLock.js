import { decorative_order_item_details_model } from '../database/schema/order/decorative_order/decorative_order_item_details.schema.js';
import series_product_order_item_details_model from '../database/schema/order/series_product_order/series_product_order_item_details.schema.js';
import {
  order_item_status,
  order_status,
  sub_category,
} from '../database/Utils/constants/constants.js';

export const PHOTO_GROUP_NO_LOCK_MESSAGE =
  'This photo number is used on one or more active orders. Group number cannot be changed.';

const buildActiveOrderPhotoReferenceCountPipeline = (photo_no_id) => [
  {
    $match: {
      $or: [
        { photo_number_id: photo_no_id },
        { different_group_photo_number_id: photo_no_id },
      ],
      item_status: {
        $nin: [order_item_status.cancelled, order_item_status.closed],
      },
    },
  },
  {
    $lookup: {
      from: 'orders',
      localField: 'order_id',
      foreignField: '_id',
      as: 'order_info',
      pipeline: [{ $project: { order_status: 1 } }],
    },
  },
  { $unwind: { path: '$order_info', preserveNullAndEmptyArrays: true } },
  {
    $match: {
      'order_info.order_status': {
        $nin: [order_status.closed, order_status.cancelled],
      },
    },
  },
  { $count: 'count' },
];

export const getPhotoActiveOrderLineCount = async (photo_no_id) => {
  if (!photo_no_id) return 0;

  const [decorative_result, series_result] = await Promise.all([
    decorative_order_item_details_model.aggregate(
      buildActiveOrderPhotoReferenceCountPipeline(photo_no_id)
    ),
    series_product_order_item_details_model.aggregate(
      buildActiveOrderPhotoReferenceCountPipeline(photo_no_id)
    ),
  ]);

  return (
    (decorative_result?.[0]?.count || 0) + (series_result?.[0]?.count || 0)
  );
};

export const isPhotoLockedForGroupChange = async (photo_no_id) => {
  const count = await getPhotoActiveOrderLineCount(photo_no_id);
  return count > 0;
};

const toIdString = (id) => (id ? String(id) : null);

export const getPhotoGroupAssignmentIds = (photoDoc) => {
  const ids = [];
  const primary = toIdString(photoDoc?.group_id);
  if (primary) ids.push(primary);

  if (
    photoDoc?.sub_category_type === sub_category.hybrid &&
    Array.isArray(photoDoc?.hybrid_group_no)
  ) {
    photoDoc.hybrid_group_no.forEach((entry) => {
      const hybridId = toIdString(entry?._id);
      if (hybridId) ids.push(hybridId);
    });
  }

  return [...new Set(ids)].sort();
};

export const hasPhotoGroupAssignmentChanged = (existingPhoto, nextDetails) => {
  const subType =
    nextDetails?.sub_category_type ?? existingPhoto?.sub_category_type;

  const existingIds = getPhotoGroupAssignmentIds({
    group_id: existingPhoto?.group_id,
    sub_category_type: subType,
    hybrid_group_no: existingPhoto?.hybrid_group_no,
  });

  const nextIds = getPhotoGroupAssignmentIds({
    group_id: nextDetails?.group_id ?? existingPhoto?.group_id,
    sub_category_type: subType,
    hybrid_group_no:
      nextDetails?.hybrid_group_no !== undefined
        ? nextDetails.hybrid_group_no
        : existingPhoto?.hybrid_group_no,
  });

  if (existingIds.length !== nextIds.length) return true;
  return existingIds.some((id, index) => id !== nextIds[index]);
};
