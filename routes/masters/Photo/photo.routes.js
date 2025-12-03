import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addPhoto,
  download_excel_photo_album,
  downloadPhotoAlbumImagesZip,
  downloadPhotoAlbumZip,
  dropdownPhoto,
  fetch_available_photo_quantity,
  fetchPhotoAlbumList,
  fetchPhotoList,
  fetchSinglePhoto,
  updatePhoto,
  updatePhotoStatus,
} from '../../../controllers/masters/Photo/photo.controller.js';
import { MulterFunction } from '../../../config/multer/multer.js';
import { group_no_dropdown_for_hybrid_photo_master } from '../../../controllers/factory/grouping/grouping_done.controller.js';

const photoRouter = express.Router();

photoRouter.post(
  '/add-photo',
  AuthMiddleware,
  MulterFunction(`public/upload/images/photo_no`).fields([
    { name: 'images' },
    { name: 'banner_image', maxCount: 1 },
  ]),
  addPhoto
);
photoRouter.patch(
  '/update-photo/:id',
  AuthMiddleware,
  MulterFunction(`public/upload/images/photo_no`).fields([
    { name: 'images' },
    { name: 'banner_image', maxCount: 1 },
  ]),
  updatePhoto
);

photoRouter.patch(
  '/update-status-photo/:id',
  AuthMiddleware,
  MulterFunction(`public/upload/images/photo_no`).fields([{ name: 'images' }]),
  updatePhotoStatus
);
photoRouter.get('/single-photo/:id', AuthMiddleware, fetchSinglePhoto);
photoRouter.post('/list-photo', AuthMiddleware, fetchPhotoList);
photoRouter.post('/list-photo-album', AuthMiddleware, fetchPhotoAlbumList);
photoRouter.post(
  '/download-photo-album-zip',
  AuthMiddleware,
  downloadPhotoAlbumZip
);
photoRouter.post(
  '/download-photo-images',
  AuthMiddleware,
  downloadPhotoAlbumImagesZip
);
// Export APi Done
photoRouter.post(
  '/download-photo-album-excel',
  AuthMiddleware,
  download_excel_photo_album
);

photoRouter.get('/dropdown-photo', AuthMiddleware, dropdownPhoto);
photoRouter.post(
  '/group-no-dropdown-for-hybrid-photo-master',
  AuthMiddleware,
  group_no_dropdown_for_hybrid_photo_master
);
photoRouter.post(
  '/fetch-available-photo-quantity',
  // AuthMiddleware,
  fetch_available_photo_quantity
);

export default photoRouter;
