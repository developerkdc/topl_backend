import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { addPhoto, dropdownPhoto, fetchPhotoList, fetchSinglePhoto, updatePhoto } from "../../../controllers/masters/Photo/photo.controller.js";
import { MulterFunction } from "../../../config/multer/multer.js";

const photoRouter = express.Router();


photoRouter.post("/add-photo", AuthMiddleware, MulterFunction(`public/upload/images/photo_no`).array("images"),addPhoto)
photoRouter.patch("/update-photo/:id", AuthMiddleware, MulterFunction(`public/upload/images/photo_no`).array("images"),updatePhoto)

photoRouter.get("/single-photo/:id", AuthMiddleware, fetchSinglePhoto)
photoRouter.post("/list-photo", AuthMiddleware, fetchPhotoList)

photoRouter.get("/dropdown-photo", AuthMiddleware, dropdownPhoto)

export default photoRouter;