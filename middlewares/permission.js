import verifyToken from './verifyToken.js';
import { SomethingWrong, UserNotFound } from '../utils/response/response.js';
import { ExtractRequiredPermission } from '../utils/permissionRequirement/requirement.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FetchUserByUserName } from '../utils/fetchDetails/fetchDetailsByUserName.js';
import UserModel from '../database/schema/user.schema.js';
import ApiError from '../utils/errors/apiError.js';

// Get the directory name of the current module file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const CheckRoleAndTokenAccess = async (req, res, next) => {
//   try {
//     const decoded = await verifyToken(req, res, next);
//     if (!decoded) {
//       return res.status(400).json({
//         result: [],
//         status: false,
//         message: "Access Denied: Invalid token format or token not provided",
//       });
//     }
//     const userName = decoded.user_name;
//     const user = await FetchUserByUserName(req, res, userName);
//     if (!user) {
//       return res.status(400).json({ result: [], status: false, message: UserNotFound });
//     }
//     req.userDetails = user;
//     const logEntry = `${new Date().toISOString()} - ${req.method} ${req.url} - User: ${
//       req.userDetails ? `${req.userDetails.first_name} ${req.userDetails.last_name}` : "Guest"
//     }\n`;
//     console.log(logEntry);
//     fs.appendFile(path.join(__dirname, "api.log"), logEntry, (err) => {
//       if (err) {
//         console.error("Error writing to log file:", err);
//       }
//     });

//     if (req.originalUrl != "/api/V1/profile/list-user-profile") {
//       const requiredPermission = ExtractRequiredPermission(req.route.path);
//       if (!requiredPermission) {
//         return res.status(400).json({
//           result: [],
//           status: false,
//           message: "Required permission not specified for this route",
//         });
//       }
//       if (user?.role_id.permissions && user?.role_id.permissions[requiredPermission] === true) {
//         return next();
//       } else {
//         return res.status(400).json({
//           result: [],
//           status: false,
//           message: "Access Denied. You are not allowed to access this api endpoint.",
//         });
//       }
//     }
//     return next();
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       result: [],
//       status: false,
//       message: SomethingWrong,
//     });
//   }
// };

// export default CheckRoleAndTokenAccess;

const RolesPermissions = (name, key) => {
  return async (req, res, next) => {
    try {
      let user = req?.userDetails;
      // const user = await UserModel.findById(userId).populate("role_id");
      // if (!user) {
      //   return next(new ApiError("User Not Found.", 404));
      // }

      if (
        !user?.role_id ||
        user?.role_id?.status == false ||
        user?.role_id?.deleted_at !== null
      ) {
        // return next(new ApiError("User role not found or disabled.", 403));
        return res
          .status(403)
          .json({
            result: [],
            status: false,
            message: 'User role not found or role is disabled.',
          });
      }

      const isAuthorized = user?.role_id?.permissions?.[name]?.[key];
      if (isAuthorized != true) {
        return res.status(400).json({
          result: [],
          status: false,
          message:
            'Access Denied. You are not allowed to access this api endpoint.',
        });
      }

      next();
    } catch (error) {
      next(new ApiError(SomethingWrong, 500));
    }
  };
};

export default RolesPermissions;
