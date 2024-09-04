import express from "express";
import {
  FetchGroupImage,
  UpdateImagesForGroup,
  UpdateImagesForCutting,
  UpdateImagesForFinishing,
  UpdateImagesForTapping,
  UpdateImagesForRawSmoking,
  FetchRawImage,
  UpdateImagesForGroupSmoking,
} from "../../controllers/image/ListImage.js";
import { MulterFunction } from "../../config/multer/multer.js";

const router = express.Router();

// image list based on group no
router.get("/get-image-based-on-group", FetchGroupImage);

// image list based on item id
router.get("/get-image-based-on-itemId", FetchRawImage);

// update image for group
router.post(
  "/update-image",
  MulterFunction("./public/upload/images/group").fields([{ name: "group_images" }]),
  UpdateImagesForGroup
);

// update image for cutting
router.post(
  "/update-image-on-cutting",
  MulterFunction("./public/upload/images/cutting").fields([{ name: "cutting_images" }]),
  UpdateImagesForCutting
);

// update image for tapping
router.post(
  "/update-image-on-tapping",
  MulterFunction("./public/upload/images/tapping").fields([{ name: "tapping_images" }]),
  UpdateImagesForTapping
);

// update image for finising
router.post(
  "/update-image-on-finishing",
  MulterFunction("./public/upload/images/finishing").fields([
    { name: "finishing_images" },
  ]),
  UpdateImagesForFinishing
);

// update image for raw smoke
router.post(
  "/update-image-on-raw-smoke",
  MulterFunction("./public/upload/images/smoke").fields([
    { name: "smoke_images" },
  ]),
  UpdateImagesForRawSmoking
);

// update image for raw dying
router.post(
  "/update-image-on-raw-dying",
  MulterFunction("./public/upload/images/dying").fields([
    { name: "dying_images" },
  ]),
  UpdateImagesForRawSmoking
);


// update image for group smok
router.post(
  "/update-image-group-smoke",
  MulterFunction("./public/upload/images/smoke").fields([{ name: "smoke_images" }]),
  UpdateImagesForGroupSmoking
);

// update image for group dying

router.post(
  "/update-image-group-dying",
  MulterFunction("./public/upload/images/dying").fields([{ name: "dying_images" }]),
  UpdateImagesForGroupSmoking
);

export default router;
