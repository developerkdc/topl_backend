import fs from "fs";
import multer from "multer";
import { promises as fsPromises } from "fs";
import { join } from "path";

export const MulterFunction = (dist) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (!fs.existsSync(dist)) {
        fs.mkdirSync(dist, { recursive: true });
      }
      cb(null, dist);
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
  const upload = multer({ storage: storage });
  return upload;
};

export const deleteImagesFromStorage = async (imagesFolderPath, deletedImages) => {
  try {
    if (!deletedImages || deletedImages.length === 0) {
      throw new Error("Please provide at least one image to delete.");
    }

    let flag = true;
    const deletionPromises = deletedImages.map(async (image) => {
      const imagePath = join(imagesFolderPath, image);
      try {
        await fsPromises.unlink(imagePath);
      } catch (error) {
        flag = false;
        console.error(`Error deleting image file ${imagePath}:`, error);
        return false;
      }
    });

    await Promise.all(deletionPromises);
    return true;
  } catch (error) {
    // console.error("Error deleting images:", error);
    return false;
  }
};
