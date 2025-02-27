import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import fs from 'fs';

export const addPhoto = catchAsync(async (req, res, next) => {
  let { photo_number } = req.body;
  try {
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
    await savePhotoData.save();

    if (!savePhotoData) {
      return next(new ApiError('Failed to insert data', 400));
    }

    const response = new ApiResponse(
      201,
      'Photo Added Successfully',
      savePhotoData
    );

    return res.status(201).json(response);
  } catch (error) {
    throw error;
  }
});

export const updatePhoto = catchAsync(async (req, res, next) => {
  try {
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
      console.log(error);
      error.message = 'Invalid data: removeImages field should be array';
      throw error;
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
      photo_number: photo_number,
      status: status,
      updated_by: authUserDetail?._id,
    };

    const fetchPhotoData = await photoModel.findOne({ _id: id });
    if (bannerImage) {
      photoData.banner_image = bannerImage;
      if (fs.existsSync(fetchPhotoData?.banner_image?.path)) {
        fs.unlinkSync(fetchPhotoData?.banner_image?.path);
      }
    }

    const updatePhotoData = await photoModel.updateOne(
      { _id: id },
      {
        $set: photoData,
        $push: {
          images: { $each: newPhotoImages },
        },
      }
    );

    if (updatePhotoData.matchedCount <= 0) {
      return next(new ApiError('Document not found', 404));
    }
    if (!updatePhotoData.acknowledged || updatePhotoData.modifiedCount <= 0) {
      return next(new ApiError('Failed to update document', 400));
    }

    //remove images logic
    if (removeImages && removeImages.length > 0) {
      const removePhoto = await photoModel.updateOne(
        { _id: id },
        {
          $pull: {
            images: { filename: { $in: removeImages } },
          },
        }
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

    const response = new ApiResponse(
      200,
      'Photo Update Successfully',
      updatePhotoData
    );

    return res.status(201).json(response);
  } catch (error) {
    throw error;
  }
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
  const photoList = await photoModel.aggregate([
    {
      $match: {
        status: true,
      },
    },
    {
      $project: {
        photo_number: 1,
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
