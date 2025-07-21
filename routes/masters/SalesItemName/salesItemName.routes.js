import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addPhoto,
  download_excel_photo_album,
  downloadPhotoAlbumZip,
  dropdownPhoto,
  fetchPhotoAlbumList,
  fetchPhotoList,
  fetchSinglePhoto,
  updatePhoto,
  updatePhotoStatus,
} from '../../../controllers/masters/Photo/photo.controller.js';
import { MulterFunction } from '../../../config/multer/multer.js';
import { addSalesItemNameModel, dropdownSalesItemName } from '../../../controllers/masters/SalesItemName/salesItemName.controller.js';

const salesItemNameRouter = express.Router();

salesItemNameRouter.post('/add-salesItemName', AuthMiddleware, addSalesItemNameModel);
// salesItemNameRouter.patch(
//   '/update-photo/:id',
//   AuthMiddleware,
//   MulterFunction(`public/upload/images/photo_no`).fields([
//     { name: 'images' },
//     { name: 'banner_image', maxCount: 1 },
//   ]),
//   updatePhoto
// );

// salesItemNameRouter.patch(
//   '/update-status-photo/:id',
//   AuthMiddleware,
//   MulterFunction(`public/upload/images/photo_no`).fields([{ name: 'images' }]),
//   updatePhotoStatus
// );
// salesItemNameRouter.get('/single-photo/:id', AuthMiddleware, fetchSinglePhoto);
// salesItemNameRouter.post('/list-photo', AuthMiddleware, fetchPhotoList);
// salesItemNameRouter.post('/list-photo-album', AuthMiddleware, fetchPhotoAlbumList);

// salesItemNameRouter.post(
//   '/download-photo-album-zip',
//   AuthMiddleware,
//   downloadPhotoAlbumZip
// );
// // Export APi Done
// salesItemNameRouter.post(
//   '/download-photo-album-excel',
//   AuthMiddleware,
//   download_excel_photo_album
// );

salesItemNameRouter.post('/dropdown-sales-item-name', AuthMiddleware, dropdownSalesItemName);

export default salesItemNameRouter;
