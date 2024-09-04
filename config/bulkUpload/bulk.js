import fs from "fs";
import multer from "multer";
import path from "path";

const multerFunction = (destination) => {
  if (!fs.existsSync("public/upload")) {
    fs.mkdirSync("public/upload", { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      let dynamicDestination = `public/upload/${destination}`;

      if (req.query.folder_name) {
        dynamicDestination = path.join(
          dynamicDestination,
          req.query.folder_name
        );
      }
      if (!fs.existsSync(dynamicDestination)) {
        fs.mkdirSync(dynamicDestination, { recursive: true });
      }
      cb(null, dynamicDestination);
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  // Modify the multer setup to accept only Excel files (xlsx)
  const fileFilter = function (req, file, cb) {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only Excel files (xlsx) are allowed."),
        false
      );
    }
  };

  return multer({ storage: storage, fileFilter: fileFilter });
};

export default multerFunction;
