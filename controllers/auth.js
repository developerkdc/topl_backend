import getConfigs from "../config/config.js";
import userModel from "../database/schema/user.schema.js";
import { create, generateOTP, verify } from "../utils/authServices/index.js";
import { SendOtpEmail } from "../utils/emailServices/otp.js";
import catchAsync from "../utils/errors/catchAsync.js";
import {
  EmailInValid,
  EmailRequired,
  EmployeeIDRequired,
  OtpNotValid,
  OtpNotVerified,
  OtpRequired,
  OtpSentToEmail,
  OtpVerified,
  PassowrdRequired,
  PasswordInValid,
  PasswordReset,
  UserNotFound,
} from "../utils/response/response.js";

const Configs = getConfigs();

export const SignIn = catchAsync(async (req, res, next) => {
  const origin = req.get("Origin");
  const { employee_id, password } = req.body;
  if (!employee_id)
    return res.status(400).json({
      result: [],
      status: false,
      message: EmployeeIDRequired,
    });

  if (!password)
    return res.status(400).json({
      result: [],
      status: false,
      message: PassowrdRequired,
    });

  const user = await userModel.findOne({ employee_id: employee_id }).select("-otp -verify_otp -otp_expiry_date").populate("role_id");

  if (!user) {
    return res.status(401).json({
      result: [],
      status: false,
      message: "User not found with this employee Id.",
    });
  }
  if (user.status == false) {
    return res.status(401).json({
      result: [],
      status: false,
      message: "You are Blocked By Admin",
    });
  }
  const passwordHash = user.password;
  const passwordMatch = await verify(password, passwordHash);

  if (!passwordMatch) {
    return res.status(401).json({ result: [], status: false, message: PasswordInValid });
  }

  const token = user.jwtToken(next);
  const options = {
    expires: new Date(Date.now() + Configs.cookie.cookie_expire * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "Lax",
  };

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");

  return res.status(200).cookie("token", token, options).json({
    token,
    result: user,
    status: true,
    message: "Login successfully.",
  });
});

export const ForgetPassword = catchAsync(async (req, res) => {
  const { email_id } = req.body;

  if (!email_id) {
    return res.status(400).json({ result: [], status: false, message: EmailRequired });
  }

  const user = await userModel.findOne({ email_id: email_id });
  if (!user) {
    return res.status(401).json({ message: "User not found with this email Id." });
  }
  // Generate OTP
  const otp = generateOTP();

  // Calculate OTP expiry date
  const otpExpiryDate = new Date();
  const formattedExpiryDate = otpExpiryDate.toISOString();

  await userModel.findOneAndUpdate(
    { email_id: email_id },
    {
      $set: {
        otp: otp,
        otp_expiry_date: formattedExpiryDate,
      },
    },
    { new: true, useFindAndModify: false }
  );

  // Send OTP to the user's email
  SendOtpEmail(email_id, `Your OTP is: ${otp}`, "Your OTP");

  return res.status(200).json({ result: [], status: true, message: OtpSentToEmail });
});

export const VerifyOtp = catchAsync(async (req, res) => {
  const { email_id, otp } = req.body;

  if (!email_id) {
    return res.status(400).json({ result: [], status: false, message: EmailRequired });
  }
  if (!otp) {
    return res.status(400).json({ result: [], status: false, message: OtpRequired });
  }

  const user = await userModel.findOne({ email_id: email_id });
  if (!user) {
    return res.status(400).json({
      result: [],
      status: false,
      message: EmailInValid,
    });
  }
  // Assuming user is the result of your findOneAndUpdate operation

  const otpExpiryDate = new Date(user?.otp_expiry_date); // Convert the stored string to a Date object

  if (otpExpiryDate instanceof Date && !isNaN(otpExpiryDate.getTime())) {
    const currentTime = new Date();
    const diffInMilliseconds = currentTime - otpExpiryDate;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60); // Convert milliseconds to hours

    if (Math.abs(Math.round(diffInHours)) > 1) {
      return res.status(400).json({ result: [], status: false, message: "OtpExpired" });
    }
  } else {
    console.error("Invalid otp expiry date:", user?.otp_expiry_date);
  }

  if (user.otp != otp) {
    return res.status(400).json({
      result: [],
      status: false,
      message: OtpNotValid,
    });
  }
  await userModel.findOneAndUpdate(
    { email_id: email_id },
    {
      $set: {
        verify_otp: true,
      },
    },
    { new: true, useFindAndModify: false }
  );

  return res.status(200).json({ result: [], status: true, message: OtpVerified });
});

export const ResetPassword = catchAsync(async (req, res) => {
  const { password, employee_id } = req.body;
  if (!employee_id) {
    return res.status(400).json({ result: [], status: false, message: EmployeeIDRequired });
  }
  if (!password) {
    return res.status(400).json({ result: [], status: false, message: PassowrdRequired });
  }

  const user = await userModel.findOne({ employee_id: employee_id });
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
    { employee_id: employee_id },
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

  return res.status(200).json({ result: [], status: true, message: PasswordReset });
});
