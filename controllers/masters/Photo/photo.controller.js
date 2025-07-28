import fs from 'fs';
import mongoose from 'mongoose';
import archiver from 'archiver';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { StatusCodes } from '../../../utils/constants.js';
import path from 'path';
import { createPhotoAlbumExcel } from '../../../config/downloadExcel/Logs/Masters/photoAlbum.js';
import { sub_category } from '../../../database/Utils/constants/constants.js';

export const addPhoto = catchAsync(async (req, res, next) => {
  let { photo_number } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    photo_number = photo_number?.toUpperCase();
    const authUserDetail = req.userDetails;

    if (!photo_number) {
      return next(new ApiError('Photo number is required', 400));
    }

    const maxNumber = await photoModel.aggregate([
      {
        $group: {
          _id: null,
          max: { $max: '$sr_no' },
        },
      },
    ]);

    const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;

    const photoImagesFiles = req.files?.images;
    let images = [];
    if (photoImagesFiles && photoImagesFiles?.length > 0) {
      images = photoImagesFiles?.map((e) => e);
    }

    const bannerImagesFile = req.files?.banner_image;
    let bannerImage;
    if (
      bannerImagesFile &&
      bannerImagesFile?.length > 0 &&
      bannerImagesFile?.[0]
    ) {
      bannerImage = bannerImagesFile?.[0];
    }

    let other_details = {};
    if (req.body?.other_details) {
      try {
        const other_details_data = JSON.parse(req.body?.other_details);
        other_details = other_details_data;
      } catch (error) {
        console.log('Failed to parse other details', error);
        throw error;
      }
    }

    const photoData = {
      ...other_details,
      sr_no: maxSrNo,
      photo_number: photo_number,
      images: images,
      banner_image: bannerImage,
      created_by: authUserDetail?._id,
      updated_by: authUserDetail?._id,
    };

    const savePhotoData = new photoModel(photoData);
    const savedData = await savePhotoData.save({ session });

    if (!savedData) {
      return next(new ApiError('Failed to insert data', 400));
    }

    let group_no_id = [savePhotoData?.group_id];
    if (savePhotoData?.sub_category_type === sub_category?.hybrid) {
      const hybrid_group_no = savePhotoData?.hybrid_group_no?.map((e) => e?._id);
      group_no_id = [...group_no_id, ...hybrid_group_no]
    }
    const isGroupExist = await grouping_done_items_details_model.find({
      _id: { $in: group_no_id },
    }).session(session);

    if (!isGroupExist || isGroupExist?.length <= 0) {
      return next(new ApiError('Group data not found', 400));
    }

    const GroupDataUpdated = await grouping_done_items_details_model.updateMany(
      { _id: { $in: group_no_id } },
      {
        $set: {
          photo_no: savePhotoData?.photo_number,
          photo_no_id: savePhotoData?._id,
        },
      },
      { session }
    );

    if (GroupDataUpdated.matchedCount <= 0) {
      return next(new ApiError('Group not found', 400));
    }

    if (!GroupDataUpdated.acknowledged || GroupDataUpdated.modifiedCount <= 0) {
      return next(new ApiError('Failed to update group', 400));
    }
    await session.commitTransaction();
    const response = new ApiResponse(
      201,
      'Photo Added Successfully',
      savePhotoData
    );

    return res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const updatePhoto = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    let { photo_number, status } = req.body;
    const { id } = req.params;
    const authUserDetail = req.userDetails;

    if (!id || !mongoose.isValidObjectId(id)) {
      return next(new ApiError('Invalid Params Id', 400));
    }

    const photoImagesFiles = req.files?.images;
    let newPhotoImages = [];
    if (photoImagesFiles && photoImagesFiles?.length > 0) {
      newPhotoImages = photoImagesFiles?.map((e) => e);
    }

    const bannerImagesFile = req.files?.banner_image;
    let bannerImage;
    if (bannerImagesFile?.length > 0 && bannerImagesFile?.[0]) {
      bannerImage = bannerImagesFile?.[0];
    }

    let removeImages = [];
    try {
      const removeFile = req.body.removeImages;
      if (removeFile) {
        removeImages = JSON.parse(removeFile);
        if (!Array.isArray(removeImages)) {
          throw new Error(
            'Invalid data type: removeImages field should be array'
          );
        }
      }
    } catch (error) {
      error.message = 'Invalid data: removeImages field should be array';
      throw error;
    }

    let other_details = {};
    if (req.body?.other_details) {
      try {
        const other_details_data = JSON.parse(req.body?.other_details);
        other_details = other_details_data;
      } catch (error) {
        throw error;
      }
    }
    const photoData = {
      ...other_details,
      photo_number: photo_number,
      status: status,
      updated_by: authUserDetail?._id,
    };

    const fetchPhotoData = await photoModel.findOne({ _id: id }).session(session);
    if (bannerImage) {
      photoData.banner_image = bannerImage;
      if (fs.existsSync(fetchPhotoData?.banner_image?.path)) {
        fs.unlinkSync(fetchPhotoData?.banner_image?.path);
      }
    }

    const updatePhotoData = await photoModel.findOneAndUpdate(
      { _id: id },
      {
        $set: photoData,
        $push: {
          images: { $each: newPhotoImages },
        },
      },
      {
        session,
        new: true,
        runValidators: true,
      }
    );

    if (!updatePhotoData) {
      return next(new ApiError('Photo Details not found', 404));
    }

    //remove images logic
    if (removeImages && removeImages.length > 0) {
      const removePhoto = await photoModel.updateOne(
        { _id: id },
        {
          $pull: {
            images: { filename: { $in: removeImages } },
          },
        },
        { session }
      );

      if (!removePhoto.acknowledged || removePhoto.modifiedCount <= 0) {
        return next(new ApiError('Failed to remove photo', 400));
      }

      removeImages.forEach((file) => {
        if (fs.existsSync(`public/upload/images/photo_no/${file}`)) {
          fs.unlinkSync(`public/upload/images/photo_no/${file}`);
        }
      });
    }

    let prev_group_no_id = [fetchPhotoData?.group_id];
    if (fetchPhotoData?.sub_category_type === sub_category?.hybrid) {
      const hybrid_group_no = fetchPhotoData?.hybrid_group_no?.map((e) => e?._id);
      prev_group_no_id = [...prev_group_no_id, ...hybrid_group_no]
    }

    const prevGroupDataUpdated = await grouping_done_items_details_model.updateMany(
      { _id: { $in: prev_group_no_id } },
      {
        $set: {
          photo_no: null,
          photo_no_id: null,
        },
      },
      { session }
    );

    if (prevGroupDataUpdated.matchedCount <= 0) {
      return next(new ApiError('Previous Group not found', 400));
    }
    if (!prevGroupDataUpdated.acknowledged || prevGroupDataUpdated.modifiedCount <= 0) {
      return next(new ApiError('Failed to update previous group', 400));
    }

    let group_no_id = [updatePhotoData?.group_id];
    if (updatePhotoData?.sub_category_type === sub_category?.hybrid) {
      const hybrid_group_no = updatePhotoData?.hybrid_group_no?.map((e) => e?._id);
      group_no_id = [...group_no_id, ...hybrid_group_no]
    }
    const isGroupExist = await grouping_done_items_details_model.find({
      _id: { $in: group_no_id },
    }).session(session);

    if (!isGroupExist || isGroupExist?.length <= 0) {
      return next(new ApiError('Group data not found', 400));
    }

    const GroupDataUpdated = await grouping_done_items_details_model.updateMany(
      { _id: { $in: group_no_id } },
      {
        $set: {
          photo_no: updatePhotoData?.photo_number,
          photo_no_id: updatePhotoData?._id,
        },
      },
      { session }
    );

    if (GroupDataUpdated.matchedCount <= 0) {
      return next(new ApiError('Group not found', 400));
    }

    if (!GroupDataUpdated.acknowledged || GroupDataUpdated.modifiedCount <= 0) {
      return next(new ApiError('Failed to update group', 400));
    }

    const response = new ApiResponse(
      200,
      'Photo Update Successfully',
      updatePhotoData
    );
    await session.commitTransaction();
    return res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});
export const updatePhotoStatus = catchAsync(async (req, res, next) => {
  let { status } = req.body;
  const { id } = req.params;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const photoData = {
    status: status,
    updated_by: authUserDetail?._id,
  };

  const fetchPhotoData = await photoModel.findOne({ _id: id });
  if (!fetchPhotoData) {
    return next(new ApiError('Photo Details not found', StatusCodes.NOT_FOUND));
  }
  console.log(photoData, ' photoData');
  const updatePhotoData = await photoModel.updateOne(
    { _id: id },
    {
      $set: photoData,
    }
  );

  if (updatePhotoData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (!updatePhotoData.acknowledged || updatePhotoData.modifiedCount <= 0) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Photo Update Successfully',
    updatePhotoData
  );
  return res.status(201).json(response);
});

export const fetchPhotoList = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  let search_query = {};

  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  // Aggregation stage
  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
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
      as: 'created_by',
    },
  };
  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
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
      as: 'updated_by',
    },
  };
  const aggCreatedByUnwind = {
    $unwind: {
      path: '$created_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUpdatedByUnwind = {
    $unwind: {
      path: '$updated_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggSort = {
    $sort: {
      [sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };

  const listAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggSort,
    aggSkip,
    aggLimit,
  ]; // aggregation pipiline

  const photoData = await photoModel.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [
    aggCreatedByLookup,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggMatch,
    aggCount,
  ]; // total aggregation pipiline

  const totalDocument = await photoModel.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit);

  const response = new ApiResponse(200, 'Photo Data Fetched Successfully', {
    data: photoData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSinglePhoto = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const aggregate = [
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
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
        as: 'created_by',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'updated_by',
        foreignField: '_id',
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
        as: 'updated_by',
      },
    },
    {
      $unwind: {
        path: '$created_by',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$updated_by',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const photoData = await photoModel.aggregate(aggregate);

  if (photoData && photoData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Photo Data Fetched Successfully',
    photoData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownPhoto = catchAsync(async (req, res, next) => {

  const { sub_category_type } = req.query;

  const match_query = {
    status: true,
  };

  if(sub_category.hybrid === sub_category_type){
    match_query.sub_category_type = sub_category.hybrid
  }

  const photoList = await photoModel.aggregate([
    {
      $match: {
        ...match_query
      },
    },
    {
      $project: {
        photo_number: 1,
        sales_item_name: 1,
        'images.destination': 1,
        'images.filename': 1,
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Photo Dropdown Fetched Successfully',
    photoList
  );
  return res.status(200).json(response);
});

export const fetchPhotoAlbumList = catchAsync(async (req, res, next) => {
  const { sortBy = 'updatedAt', sort = 'desc', search = '' } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  let search_query = {};

  if (search !== '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: { data: [] },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);
  const match_query = { ...filterData, ...search_query };

  const aggMatch = { $match: match_query };
  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
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
      as: 'created_by',
    },
  };
  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
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
      as: 'updated_by',
    },
  };

  const aggSort = { $sort: { [sortBy]: sort === 'desc' ? -1 : 1 } };
  // const aggSkip = { $skip: (page - 1) * limit };
  // const aggLimit = { $limit: limit };

  const pipeline = [
    aggMatch,
    aggCreatedByLookup,
    aggUpdatedByLookup,
    {
      $facet: {
        data: [aggSort],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const result = await photoModel.aggregate(pipeline);
  const photoData = result[0].data;
  const totalCount = result[0].totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json(
    new ApiResponse(200, 'Photo Data Fetched Successfully', {
      data: photoData,
      totalPages,
    })
  );
});

export const downloadPhotoAlbumZip = catchAsync(async (req, res, next) => {
  const { selectedPhotos = [] } = req.body;

  if (!Array.isArray(selectedPhotos) || selectedPhotos.length === 0) {
    return res.status(400).json({
      status: false,
      message: 'No photos selected',
    });
  }

  const photos = await photoModel.find({ _id: { $in: selectedPhotos } });

  if (!photos || photos.length === 0) {
    return res.status(404).json({
      status: false,
      message: 'No valid photos found',
    });
  }

  // Set ZIP response headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=photos.zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => next(err));
  archive.pipe(res);

  for (let photo of photos) {
    console.log(photo.photo_number);
    const bannerImage = photo?.banner_image;

    if (!bannerImage || !bannerImage.path || !bannerImage.filename) continue;

    // Normalize the file path
    const fullPath = path.join(
      process.cwd(),
      bannerImage?.path.replace(/\\/g, '/')
    );

    if (fs.existsSync(fullPath)) {
      const ext = path.extname(
        bannerImage.originalname || bannerImage.filename
      );
      const downloadFileName = `${photo?.photo_number}${ext}`;

      archive.file(fullPath, {
        name: downloadFileName,
      });
    } else {
      console.warn(`File not found: ${fullPath}`);
    }
  }

  await archive.finalize();
});

export const download_excel_photo_album = catchAsync(async (req, res, next) => {
  const { sortBy = 'updatedAt', sort = 'desc', search = '' } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  let search_query = {};

  if (search !== '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: { data: [] },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);
  const match_query = { ...filterData, ...search_query };

  const aggMatch = { $match: match_query };
  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
          },
        },
      ],
      as: 'created_by',
    },
  };
  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
          },
        },
      ],
      as: 'updated_by',
    },
  };

  const aggSort = { $sort: { [sortBy]: sort === 'desc' ? -1 : 1 } };

  const pipeline = [
    aggMatch,
    aggCreatedByLookup,
    aggUpdatedByLookup,
    {
      $facet: {
        data: [aggSort],
        // totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const result = await photoModel.aggregate(pipeline);
  const photoData = result[0].data;
  // const totalCount = result[0].totalCount?.[0]?.count || 0;
  // const totalPages = Math.ceil(totalCount / limit);
  await createPhotoAlbumExcel(photoData, req, res);
  // return res.status(200).json(
  //   new ApiResponse(200, 'Photo Data Fetched Successfully', {
  //     data: photoData,
  //     // totalPages,
  //   })
  // );
});
