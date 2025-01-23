import jwt from 'jsonwebtoken';
import { SomethingWrong, UserNotFound } from '../utils/response/response.js';
import getConfigs from '../config/config.js';
import UserModel from '../database/schema/user.schema.js';
const Configs = getConfigs();

// const verifyToken = async (req, res, next) => {
//   try {
//     const token = req.cookies.token;
//     if (!token) {
//       return null;
//     } else {
//       if (token.startsWith("Bearer ")) {
//         token = token.slice(7, token.length).trimLeft();
//       }
//       const decoded = jwt.verify(token, Configs.jwt.accessSecret);

//       req.tokenDetails = decoded;

//       return decoded;
//     }
//   } catch (err) {
//     return res.status(500).json({ result: [], status: false, message: SomethingWrong });
//   }
// };

// export default verifyToken;

const AuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        result: [],
        status: false,
        message: 'Access Denied: Token not provided',
      });
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trimLeft();
    }

    const tokenDetails = jwt.verify(token, Configs.jwt.accessSecret);
    if (!tokenDetails) {
      // return next(new ApiError("Invalid token.", 400));
      return res.status(401).json({
        result: [],
        status: false,
        message: 'Access Denied: Invalid token.',
      });
    }

    const userDetails = await UserModel.findOne({
      user_name: tokenDetails?.user_name,
    }).populate('role_id');

    if (!userDetails) {
      return res
        .status(400)
        .json({ result: [], status: false, message: UserNotFound });
    }

    if (userDetails?.status == false || userDetails?.deleted_at !== null) {
      return res.status(403).json({
        result: [],
        status: false,
        message: 'Your account has been suspended. Please contact admin.',
      });
      // return next(new ApiError("Your account has been suspended. Please contact admin.", 403));
    }

    req.userDetails = userDetails;
    next();
  } catch (error) {
    return next(error);
  }
};

export default AuthMiddleware;
