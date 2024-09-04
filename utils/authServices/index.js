import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import getConfigs from "../../config/config.js";
const Configs = getConfigs();

const generateRandomPassword = (length) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

const salt = Number(Configs.salt.salt);

const create = (password) => {
  return bcrypt.hash(password, salt);
};

const verify = (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};

const generateAccessToken = (userDetails) => {
  const token = jwt.sign(userDetails, Configs.jwt.accessSecret, {
    expiresIn: Configs.jwt.accessOptions.expiresIn,
  });
  return token;
};
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export { generateRandomPassword, create, verify ,generateAccessToken,generateOTP};
