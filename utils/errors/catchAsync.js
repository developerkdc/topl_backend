import ApiError from "./apiError.js";
import fs from "fs";

const catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.log("ppppppppppppppppppppppppppppppp")
      //   if (req.files) {
      //     console.log(req.files);
      //     const { banner_image, images } = req.files;

      //     if (banner_image && banner_image.length > 0) {
      //       fs.unlinkSync(banner_image[0].path);
      //     }

      //     if (images && images.length > 0) {
      //       images.forEach((image) => {
      //         fs.unlinkSync(image.path);
      //       });
      //     }
      //   }
      if (req.files) {
        const fileFields = Object.keys(req.files);
        fileFields.forEach((field) => {
          const uploadedFiles = req.files[field];
          if (uploadedFiles && uploadedFiles.length > 0) {
            uploadedFiles.forEach((file) => {
              fs.unlinkSync(file.path);
            });
          }
        });
      }

      return next(new ApiError(error.message, 400));
    }
  };
};

export default catchAsync;
