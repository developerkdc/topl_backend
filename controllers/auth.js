import mongoose from 'mongoose';
import getConfigs from '../config/config.js';
import userModel from '../database/schema/user.schema.js';
import ApiResponse from '../utils/ApiResponse.js';
import { create, generateOTP, verify } from '../utils/authServices/index.js';
import { StatusCodes } from '../utils/constants.js';
import { SendOtpEmail } from '../utils/emailServices/otp.js';
import catchAsync from '../utils/errors/catchAsync.js';
import {
  EmailInValid,
  EmailRequired,
  UserNameRequired,
  OtpNotValid,
  OtpNotVerified,
  OtpRequired,
  OtpSentToEmail,
  OtpVerified,
  PassowrdRequired,
  PasswordInValid,
  PasswordReset,
  UserNotFound,
} from '../utils/response/response.js';
import os from 'os';

const Configs = getConfigs();

export const SignIn = catchAsync(async (req, res, next) => {
  const origin = req.get('Origin');
  const { user_name, password } = req.body;
  if (!user_name)
    return res.status(400).json({
      result: [],
      status: false,
      message: UserNameRequired,
    });

  if (!password)
    return res.status(400).json({
      result: [],
      status: false,
      message: PassowrdRequired,
    });

  const user = await userModel
    .findOne({ user_name: user_name })
    .select('-otp -verify_otp -otp_expiry_date')
    .populate('role_id');

  if (!user) {
    return res.status(401).json({
      result: [],
      status: false,
      message: 'User not found with this User Name.',
    });
  }
  if (user.status == false) {
    return res.status(401).json({
      result: [],
      status: false,
      message: 'You are Blocked By Admin',
    });
  }
  const passwordHash = user.password;
  const passwordMatch = await verify(password, passwordHash);

  if (!passwordMatch) {
    return res
      .status(401)
      .json({ result: [], status: false, message: PasswordInValid });
  }

  const token = user.jwtToken(next);
  const options = {
    expires: new Date(
      Date.now() + Configs.cookie.cookie_expire * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'Lax',
  };

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');

  return res.status(200).cookie('token', token, options).json({
    token,
    result: user,
    status: true,
    message: 'Login successfully.',
  });
});

export const ForgetPassword = catchAsync(async (req, res) => {
  const { user_name } = req.body;

  if (!user_name) {
    return res
      .status(400)
      .json({ result: [], status: false, message: UserNameRequired });
  }

  const user = await userModel.findOne({ user_name: user_name });
  if (!user) {
    return res
      .status(401)
      .json({ message: 'User not found with this user name.' });
  }

  if (!user.email_id) {
    return res
      .status(401)
      .json({ message: 'Email id not found. Please contact Admin' });
  }

  // Generate OTP
  const otp = generateOTP();

  // Calculate OTP expiry date
  const otpExpiryDate = new Date();
  const formattedExpiryDate = otpExpiryDate.toISOString();

  await userModel.findOneAndUpdate(
    { user_name: user_name },
    {
      $set: {
        otp: otp,
        otp_expiry_date: formattedExpiryDate,
      },
    },
    { new: true, useFindAndModify: false }
  );

  // Send OTP to the user's email
  SendOtpEmail(user?.email_id, `Your OTP is: ${otp}`, 'Your OTP');

  return res
    .status(200)
    .json({ result: [], status: true, message: OtpSentToEmail });
});

export const VerifyOtp = catchAsync(async (req, res) => {
  const { user_name, otp } = req.body;

  if (!user_name) {
    return res
      .status(400)
      .json({ result: [], status: false, message: UserNameRequired });
  }
  if (!otp) {
    return res
      .status(400)
      .json({ result: [], status: false, message: OtpRequired });
  }

  const user = await userModel.findOne({ user_name: user_name });
  if (!user) {
    return res.status(400).json({
      result: [],
      status: false,
      message: 'Invalid username, please try again later.',
    });
  }
  // Assuming user is the result of your findOneAndUpdate operation

  const otpExpiryDate = new Date(user?.otp_expiry_date); // Convert the stored string to a Date object

  if (otpExpiryDate instanceof Date && !isNaN(otpExpiryDate.getTime())) {
    const currentTime = new Date();
    const diffInMilliseconds = currentTime - otpExpiryDate;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours

    if (Math.abs(Math.round(diffInHours)) > 1) {
      return res
        .status(400)
        .json({ result: [], status: false, message: 'OtpExpired' });
    }
  } else {
    console.error('Invalid otp expiry date:', user?.otp_expiry_date);
  }

  if (user.otp != otp) {
    return res.status(400).json({
      result: [],
      status: false,
      message: OtpNotValid,
    });
  }
  await userModel.findOneAndUpdate(
    { user_name: user_name },
    {
      $set: {
        verify_otp: true,
      },
    },
    { new: true, useFindAndModify: false }
  );

  return res
    .status(200)
    .json({ result: [], status: true, message: OtpVerified });
});

export const ResetPassword = catchAsync(async (req, res) => {
  const { password, user_name } = req.body;
  if (!user_name) {
    return res
      .status(400)
      .json({ result: [], status: false, message: UserNameRequired });
  }
  if (!password) {
    return res
      .status(400)
      .json({ result: [], status: false, message: PassowrdRequired });
  }

  const user = await userModel.findOne({ user_name: user_name });
  if (!user) {
    return res.status(400).json({
      result: [],
      status: false,
      message: UserNotFound,
    });
  }

  if (user.verify_otp !== true) {
    return res.status(400).json({
      result: [],
      status: false,
      message: OtpNotVerified,
    });
  }

  // Hash the new password
  const hashedPassword = await create(password);

  // Update the user's password
  await userModel.findOneAndUpdate(
    { user_name: user_name },
    {
      $set: {
        password: hashedPassword,
        otp: null,
        otp_expiry_date: null,
        verify_otp: null,
      },
    },
    { new: true, useFindAndModify: false }
  );

  return res
    .status(200)
    .json({ result: [], status: true, message: PasswordReset });
});

export const checkServerHealth = async (req, res, next) => {
  const load_time_avg = os.loadavg();
  const server_uptime = os.uptime();
  const uptimeMinutes = Math.floor(server_uptime / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeFormatted =
    uptimeHours > 0
      ? `${uptimeHours} hours ${uptimeMinutes % 60} minutes`
      : `${uptimeMinutes} minutes`;
  const total_memory = os.totalmem() / (1024 * 1024 * 1024);
  const free_memory = os.freemem() / (1024 * 1024 * 1024);
  const used_memory = total_memory - free_memory;
  const cpus = os.cpus();

  const cpuUsage = cpus.map((cpu, index) => {
    const total = Object.values(cpu.times).reduce((acc, item) => acc + item, 0);
    const usage = ((total - cpu.times.idle) / total) * 100;
    return { core: index + 1, usage: usage?.toFixed(2) + '%' };
  });

  return res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, 'Server Health Fetched successfully', {
      // uptime: uptimeFormatted,
      cpuUsage,
      loadAverage: load_time_avg,
      total_memory: `${total_memory?.toFixed(2)} GB`,
      used_memory: `${used_memory?.toFixed(2)} GB`,
      free_memory: `${free_memory?.toFixed(2)} GB`,
      total_cpus: cpus?.length,
    })
  );
};

//fetch current connection on db
export const fetchDBConnections = catchAsync(async (req, res, next) => {
  const db = mongoose.connection

  const serverstatus = await db.db.admin().command({ serverstatus: 1 })

  return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, "Database connections fetched successfully", serverstatus?.connections))
})