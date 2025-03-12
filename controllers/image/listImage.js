import catchAsync from '../../utils/errors/catchAsync.js';
import GroupImagesModel from '../../database/schema/images/groupImages.schema.js';
import RawImagesModel from '../../database/schema/images/rawImages.schema.js';
import mongoose from 'mongoose';
import { deleteImagesFromStorage } from '../../config/multer/multer.js';

export const FetchGroupImage = catchAsync(async (req, res, next) => {
  const GroupImages = await GroupImagesModel.findOne({
    group_no: req.query.group_no,
  });
  return res.status(200).json({
    result: GroupImages,
    statusCode: 200,
    status: 'success',
  });
});
export const FetchRawImage = catchAsync(async (req, res, next) => {
  console.log(req.query.id, 'req.query.id');
  const RawImages = await RawImagesModel.findOne({
    item_details: req.query.id,
  });
  console.log(RawImages, 'RawImages');
  return res.status(200).json({
    result: RawImages,
    statusCode: 200,
    status: 'success',
  });
});

export const UpdateImagesForGroup = catchAsync(async (req, res) => {
  const imageId = req.query.id;
  const imageType = req.query.imageType;
  console.log(imageType, 'imageType');
  console.log(imageId, 'imageId');
  const files = req.files;
  console.log(files, 'files');
  const deletedImages = req.body.deleteImages;
  console.log(deletedImages, 'deletedImages');
  const updateData = {};
  // console.log(deletedImages);

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return res.status(400).json({
      status: false,
      message: 'Invalid Image ID',
      data: null,
    });
  }
  // Retrieve existing document from the database
  const existingImage = await GroupImagesModel.findById(imageId);
  console.log(existingImage, 'existingImage');
  if (!existingImage) {
    return res.status(404).json({
      status: false,
      message: 'Image not found.',
    });
  }
  updateData[imageType] = existingImage[imageType];

  if (files && Object.keys(files)?.length > 0) {
    // Add images
    if (files[imageType]?.length > 0) {
      let allImages = files[imageType].map((image) => image.filename);
      if (!updateData[imageType] || !Array.isArray(updateData[imageType])) {
        updateData[imageType] = allImages;
      } else {
        updateData[imageType] = updateData[imageType].concat(allImages);
      }
    }
  }

  if (deletedImages) {
    let deletedImagesArray = JSON.parse(deletedImages);

    if (Array.isArray(deletedImagesArray) && deletedImagesArray.length > 0) {
      if (
        updateData[imageType] &&
        Array.isArray(updateData[imageType]) &&
        updateData[imageType].length > 0
      ) {
        const deletedImagesSet = new Set(deletedImagesArray);
        updateData[imageType] = updateData[imageType].filter(
          (image) => !deletedImagesSet.has(image)
        );

        if (!updateData[imageType] || updateData[imageType].length == 0)
          updateData[imageType] = null;

        // Delete images from local storage
        let deleteData = await deleteImagesFromStorage(
          `./public/upload/images/smoke`,
          deletedImagesArray
        );
      } else {
        return res.status(400).json({
          status: false,
          message: `There are no images of type ${imageType} to delete.`,
          data: null,
        });
      }
    }
  }
  updateData.updated_at = Date.now();
  console.log(updateData);

  const image = await GroupImagesModel.findByIdAndUpdate(
    imageId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    result: image,
    status: true,
    message: 'Updated successfully',
  });
});

export const UpdateImagesForCutting = catchAsync(async (req, res) => {
  const imageId = req.query.id;
  const imageType = req.query.imageType;
  console.log(imageType, 'imageType');
  console.log(imageId, 'imageId');
  const files = req.files;
  console.log(files, 'files');
  const deletedImages = req.body.deleteImages;
  console.log(deletedImages, 'deletedImages');
  const updateData = {};
  // console.log(deletedImages);

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return res.status(400).json({
      status: false,
      message: 'Invalid Image ID',
      data: null,
    });
  }
  // Retrieve existing document from the database
  const existingImage = await GroupImagesModel.findById(imageId);
  console.log(existingImage, 'existingImage');
  if (!existingImage) {
    return res.status(404).json({
      status: false,
      message: 'Image not found.',
    });
  }

  updateData[imageType] = existingImage[imageType];

  if (files && Object.keys(files)?.length > 0) {
    // Add images
    if (files[imageType]?.length > 0) {
      let allImages = files[imageType].map((image) => image.filename);
      if (!updateData[imageType] || !Array.isArray(updateData[imageType])) {
        updateData[imageType] = allImages;
      } else {
        updateData[imageType] = updateData[imageType].concat(allImages);
      }
    }
  }

  if (deletedImages) {
    let deletedImagesArray = JSON.parse(deletedImages);

    if (Array.isArray(deletedImagesArray) && deletedImagesArray.length > 0) {
      if (
        updateData[imageType] &&
        Array.isArray(updateData[imageType]) &&
        updateData[imageType].length > 0
      ) {
        const deletedImagesSet = new Set(deletedImagesArray);
        updateData[imageType] = updateData[imageType].filter(
          (image) => !deletedImagesSet.has(image)
        );

        if (!updateData[imageType] || updateData[imageType].length == 0)
          updateData[imageType] = null;

        // Delete images from local storage
        let deleteData = await deleteImagesFromStorage(
          `./public/upload/images/cutting`,
          deletedImagesArray
        );
      } else {
        return res.status(400).json({
          status: false,
          message: `There are no images of type ${imageType} to delete.`,
          data: null,
        });
      }
    }
  }
  updateData.updated_at = Date.now();
  console.log(updateData);

  const image = await GroupImagesModel.findByIdAndUpdate(
    imageId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    result: image,
    status: true,
    message: 'Updated successfully',
  });
});

export const UpdateImagesForTapping = catchAsync(async (req, res) => {
  const imageId = req.query.id;
  const imageType = req.query.imageType;
  console.log(imageType, 'imageType');
  console.log(imageId, 'imageId');
  const files = req.files;
  console.log(files, 'files');
  const deletedImages = req.body.deleteImages;
  console.log(deletedImages, 'deletedImages');
  const updateData = {};
  // console.log(deletedImages);

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return res.status(400).json({
      status: false,
      message: 'Invalid Image ID',
      data: null,
    });
  }
  // Retrieve existing document from the database
  const existingImage = await GroupImagesModel.findById(imageId);
  console.log(existingImage, 'existingImage');
  if (!existingImage) {
    return res.status(404).json({
      status: false,
      message: 'Image not found.',
    });
  }
  updateData[imageType] = existingImage[imageType];

  if (files && Object.keys(files)?.length > 0) {
    // Add images
    if (files[imageType]?.length > 0) {
      let allImages = files[imageType].map((image) => image.filename);
      if (!updateData[imageType] || !Array.isArray(updateData[imageType])) {
        updateData[imageType] = allImages;
      } else {
        updateData[imageType] = updateData[imageType].concat(allImages);
      }
    }
  }

  if (deletedImages) {
    let deletedImagesArray = JSON.parse(deletedImages);

    if (Array.isArray(deletedImagesArray) && deletedImagesArray.length > 0) {
      if (
        updateData[imageType] &&
        Array.isArray(updateData[imageType]) &&
        updateData[imageType].length > 0
      ) {
        const deletedImagesSet = new Set(deletedImagesArray);
        updateData[imageType] = updateData[imageType].filter(
          (image) => !deletedImagesSet.has(image)
        );

        if (!updateData[imageType] || updateData[imageType].length == 0)
          updateData[imageType] = null;

        // Delete images from local storage
        let deleteData = await deleteImagesFromStorage(
          `./public/upload/images/tapping`,
          deletedImagesArray
        );
      } else {
        return res.status(400).json({
          status: false,
          message: `There are no images of type ${imageType} to delete.`,
          data: null,
        });
      }
    }
  }
  updateData.updated_at = Date.now();
  console.log(updateData);

  const image = await GroupImagesModel.findByIdAndUpdate(
    imageId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    result: image,
    status: true,
    message: 'Updated successfully',
  });
});

export const UpdateImagesForFinishing = catchAsync(async (req, res) => {
  const imageId = req.query.id;
  const imageType = req.query.imageType;
  console.log(imageType, 'imageType');
  console.log(imageId, 'imageId');
  const files = req.files;
  console.log(files, 'files');
  const deletedImages = req.body.deleteImages;
  console.log(deletedImages, 'deletedImages');
  const updateData = {};
  // console.log(deletedImages);

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return res.status(400).json({
      status: false,
      message: 'Invalid Image ID',
      data: null,
    });
  }
  // Retrieve existing document from the database
  const existingImage = await GroupImagesModel.findById(imageId);
  console.log(existingImage, 'existingImage');
  if (!existingImage) {
    return res.status(404).json({
      status: false,
      message: 'Image not found.',
    });
  }
  updateData[imageType] = existingImage[imageType];

  if (files && Object.keys(files)?.length > 0) {
    // Add images
    if (files[imageType]?.length > 0) {
      let allImages = files[imageType].map((image) => image.filename);
      if (!updateData[imageType] || !Array.isArray(updateData[imageType])) {
        updateData[imageType] = allImages;
      } else {
        updateData[imageType] = updateData[imageType].concat(allImages);
      }
    }
  }

  if (deletedImages) {
    let deletedImagesArray = JSON.parse(deletedImages);

    if (Array.isArray(deletedImagesArray) && deletedImagesArray.length > 0) {
      if (
        updateData[imageType] &&
        Array.isArray(updateData[imageType]) &&
        updateData[imageType].length > 0
      ) {
        const deletedImagesSet = new Set(deletedImagesArray);
        updateData[imageType] = updateData[imageType].filter(
          (image) => !deletedImagesSet.has(image)
        );

        if (!updateData[imageType] || updateData[imageType].length == 0)
          updateData[imageType] = null;

        // Delete images from local storage
        let deleteData = await deleteImagesFromStorage(
          `./public/upload/images/finishing`,
          deletedImagesArray
        );
      } else {
        return res.status(400).json({
          status: false,
          message: `There are no images of type ${imageType} to delete.`,
          data: null,
        });
      }
    }
  }
  updateData.updated_at = Date.now();
  console.log(updateData);

  const image = await GroupImagesModel.findByIdAndUpdate(
    imageId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    result: image,
    status: true,
    message: 'Updated successfully',
  });
});
export const UpdateImagesForGroupSmoking = catchAsync(async (req, res) => {
  const imageId = req.query.id;
  const imageType = req.query.imageType;
  console.log(imageType, 'imageType');
  console.log(imageId, 'imageId');
  const files = req.files;
  console.log(files, 'files');
  const deletedImages = req.body.deleteImages;
  console.log(deletedImages, 'deletedImages');
  const updateData = {};
  // console.log(deletedImages);

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return res.status(400).json({
      status: false,
      message: 'Invalid Image ID',
      data: null,
    });
  }
  // Retrieve existing document from the database
  const existingImage = await GroupImagesModel.findById(imageId);
  console.log(existingImage, 'existingImage');
  if (!existingImage) {
    return res.status(404).json({
      status: false,
      message: 'Image not found.',
    });
  }
  updateData[imageType] = existingImage[imageType];

  if (files && Object.keys(files)?.length > 0) {
    // Add images
    if (files[imageType]?.length > 0) {
      let allImages = files[imageType].map((image) => image.filename);
      if (!updateData[imageType] || !Array.isArray(updateData[imageType])) {
        updateData[imageType] = allImages;
      } else {
        updateData[imageType] = updateData[imageType].concat(allImages);
      }
    }
  }

  if (deletedImages) {
    let deletedImagesArray = JSON.parse(deletedImages);

    if (Array.isArray(deletedImagesArray) && deletedImagesArray.length > 0) {
      if (
        updateData[imageType] &&
        Array.isArray(updateData[imageType]) &&
        updateData[imageType].length > 0
      ) {
        const deletedImagesSet = new Set(deletedImagesArray);
        updateData[imageType] = updateData[imageType].filter(
          (image) => !deletedImagesSet.has(image)
        );

        if (!updateData[imageType] || updateData[imageType].length == 0)
          updateData[imageType] = null;

        // Delete images from local storage
        let deleteData = await deleteImagesFromStorage(
          `./public/upload/images/smoke`,
          deletedImagesArray
        );
      } else {
        return res.status(400).json({
          status: false,
          message: `There are no images of type ${imageType} to delete.`,
          data: null,
        });
      }
    }
  }
  updateData.updated_at = Date.now();
  console.log(updateData);

  const image = await GroupImagesModel.findByIdAndUpdate(
    imageId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    result: image,
    status: true,
    message: 'Updated successfully',
  });
});

export const UpdateImagesForRawSmoking = catchAsync(async (req, res) => {
  console.log(req.query, 'ddddddddddd');
  const imageId = req.query.id;
  const imageType = req.query.imageType;
  console.log(imageType, 'imageType');
  console.log(imageId, 'imageId');
  const files = req.files;
  console.log(files, 'files');
  const deletedImages = req.body.deleteImages;
  console.log(deletedImages, 'deletedImages');
  const updateData = {};
  // console.log(deletedImages);

  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    return res.status(400).json({
      status: false,
      message: 'Invalid Image ID',
      data: null,
    });
  }
  // Retrieve existing document from the database
  const existingImage = await RawImagesModel.findById(imageId);
  console.log(existingImage, 'existingImage');
  if (!existingImage) {
    return res.status(404).json({
      status: false,
      message: 'Image not found.',
    });
  }
  updateData[imageType] = existingImage[imageType];

  if (files && Object.keys(files)?.length > 0) {
    // Add images
    if (files[imageType]?.length > 0) {
      let allImages = files[imageType].map((image) => image.filename);
      if (!updateData[imageType] || !Array.isArray(updateData[imageType])) {
        updateData[imageType] = allImages;
      } else {
        updateData[imageType] = updateData[imageType].concat(allImages);
      }
    }
  }

  if (deletedImages) {
    let deletedImagesArray = JSON.parse(deletedImages);

    if (Array.isArray(deletedImagesArray) && deletedImagesArray.length > 0) {
      if (
        updateData[imageType] &&
        Array.isArray(updateData[imageType]) &&
        updateData[imageType].length > 0
      ) {
        const deletedImagesSet = new Set(deletedImagesArray);
        updateData[imageType] = updateData[imageType].filter(
          (image) => !deletedImagesSet.has(image)
        );

        if (!updateData[imageType] || updateData[imageType].length == 0)
          updateData[imageType] = null;

        // Delete images from local storage
        let deleteData = await deleteImagesFromStorage(
          `./public/upload/images/smoke`,
          deletedImagesArray
        );
      } else {
        return res.status(400).json({
          status: false,
          message: `There are no images of type ${imageType} to delete.`,
          data: null,
        });
      }
    }
  }
  updateData.updated_at = Date.now();
  console.log(updateData);

  const image = await RawImagesModel.findByIdAndUpdate(
    imageId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    result: image,
    status: true,
    message: 'Updated successfully',
  });
});
