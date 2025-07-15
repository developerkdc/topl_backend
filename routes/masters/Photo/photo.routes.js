import express from 'express';
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import {
  addPhoto,
  dropdownPhoto,
  fetchPhotoList,
  fetchSinglePhoto,
  updatePhoto,
  updatePhotoStatus,
} from '../../../controllers/masters/Photo/photo.controller.js';
import { MulterFunction } from '../../../config/multer/multer.js';

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

photoRouter.get('/dropdown-photo', AuthMiddleware, dropdownPhoto);

export default photoRouter;
