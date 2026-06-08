import catchAsync from '../../utils/errors/catchAsync.js';
import { grouping_done_items_details_model } from '../../database/schema/factory/grouping/grouping_done.schema.js';
import photoModel from '../../database/schema/masters/photo.schema.js';

export const mapGroupingToPhoto = catchAsync(async (req, res) => {
  // Build the filter to only fetch grouping done items whose photo_no_id is null or doesn't exist, and photo_no is present
  const filter = {
    photo_no: { $ne: null, $ne: '', $exists: true },
    $or: [
      { photo_no_id: null },
      { photo_no_id: { $exists: false } },
    ],
  };

  // Fetch all grouping done items
  const items = await grouping_done_items_details_model
    .find(filter)
    .select('_id photo_no')
    .lean();

  if (!items || items.length === 0) {
    return res.status(200).json({
      status: true,
      message: 'No grouping items found to map.',
      totalChecked: 0,
      totalUpdated: 0,
    });
  }

  // Get unique photo numbers (trimmed and uppercase)
  const uniquePhotoNos = [
    ...new Set(
      items
        .map((item) => (item.photo_no ? item.photo_no.trim().toUpperCase() : ''))
        .filter((photoNo) => photoNo !== '')
    ),
  ];

  if (uniquePhotoNos.length === 0) {
    return res.status(200).json({
      status: true,
      message: 'No valid photo numbers found to map.',
      totalChecked: items.length,
      totalUpdated: 0,
    });
  }

  // Fetch corresponding photos from photoModel
  const photos = await photoModel
    .find({
      photo_number: { $in: uniquePhotoNos },
    })
    .select('_id photo_number')
    .lean();

  // Create a map for fast lookup
  const photoMap = new Map();
  photos.forEach((photo) => {
    if (photo.photo_number) {
      photoMap.set(photo.photo_number.trim().toUpperCase(), photo._id);
    }
  });

  // Prepare bulk write operations
  const bulkOps = [];
  let matchedCount = 0;
  const unmatchedPhotoNos = new Set();

  for (const item of items) {
    const normPhotoNo = item.photo_no ? item.photo_no.trim().toUpperCase() : '';
    const photoId = photoMap.get(normPhotoNo);

    if (photoId) {
      bulkOps.push({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { photo_no_id: photoId } },
        },
      });
      matchedCount++;
    } else {
      if (normPhotoNo) {
        unmatchedPhotoNos.add(normPhotoNo);
      }
    }
  }

  // Execute bulk write
  if (bulkOps.length > 0) {
    await grouping_done_items_details_model.bulkWrite(bulkOps);
  }

  return res.status(200).json({
    status: true,
    message: `Successfully mapped ${matchedCount} grouping items to photo IDs.`,
    totalFound: items.length,
    totalUpdated: matchedCount,
    totalUnmatchedPhotos: unmatchedPhotoNos.size,
    unmatchedPhotoNumbers: Array.from(unmatchedPhotoNos),
  });
});
