import UserModel from '../database/schema/user.schema.js';
import { IdRequired, UserNotFound } from '../utils/response/response.js';
import catchAsync from '../utils/errors/catchAsync.js';
import { create, verify } from '../utils/authServices/index.js';
import mongoose from 'mongoose';
import { FetchUserByUserName } from '../utils/fetchDetails/fetchDetailsByUserName.js';

export const UpdateAuthUserProfile = async (req, res) => {
  // const { first_name, last_name, phone, age, gender, country_code } =
  //   req.body;
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({
      result: [],
      status: false,
      message: IdRequired,
    });
  }
  // const requiredFields = ["first_name", "last_name", "email_id"];

  // for (const field of requiredFields) {
  //   if (req.body[field] === "") {
  //     return res.status(400).json({
  //       result: [],
  //       status: false,
  //       message: `${field} should not be empty.`,
  //     });
  //   }
  // }

  const userUpdate = await UserModel.findOneAndUpdate(
    { _id: id },
    {
      $set: req.body,
    },
    { new: true, useFindAndModify: false }
  );
  if (!userUpdate) {
    return res.status(400).json({
      result: [],
      status: false,
      message: 'User Not exists with this ID.',
    });
  }
  return res.status(200).json({
    result: userUpdate,
    status: true,
    message: 'User profile updated successfully.',
  });
};

export const ChangeAuthUserPassword = catchAsync(async (req, res) => {
  const { new_password, old_password } = req.body;
  const requiredFields = ['new_password', 'old_password'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({
        result: [],
        status: false,
        message: `${field} is required.`,
      });
    }
  }

  const authUserDetail = req.userDetails;

  const user = await FetchUserByUserName(req, res, authUserDetail.user_name);
  const validOldPassword = await verify(old_password, user.password);

  if (!validOldPassword) {
    return res.status(400).json({
      result: [],
      status: false,
      message: 'Incorrect old password !',
    });
  }

  const hashedNewPassword = await create(new_password);
  const userUpdate = await UserModel.findOneAndUpdate(
    { user_name: authUserDetail.user_name },
    {
      $set: {
        password: hashedNewPassword,
      },
    },
    { new: true, useFindAndModify: false }
  );

  if (!userUpdate) {
    return res.status(404).json({
      status: false,
      message: 'User not found.',
    });
  }

  return res.status(200).json({
    result: [],
    status: true,
    message: 'Password updated successfully.',
  });
});

export const GetAuthUser = catchAsync(async (req, res) => {
  const AuthUserDetail = req.userDetails;
  const authUserById = await UserModel.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(AuthUserDetail.id),
      },
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'role_id',
        foreignField: '_id',
        as: 'role_id',
      },
    },
    {
      $unwind: {
        path: '$role_id',
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!authUserById) {
    return res.status(401).json({
      result: [],
      status: false,
      message: UserNotFound,
    });
  }
  return res.status(200).json({
    result: authUserById,
    status: true,
    message: 'Login user details.',
  });
});
