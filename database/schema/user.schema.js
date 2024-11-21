import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import getConfigs from "../../config/config.js";
import LogSchemaFunction from "./LogsSchema/logs.schema.js";

const Configs = getConfigs();
const UserSchema = new mongoose.Schema({
  user_name: {
    type: String,
    required: [true, "User Name is required."],
    indexedDB: true,
    unique: [true, "User Name already exist."],
    trim: true,
    uppercase: true
  },
  user_type: {
    type: String,
    required: [true, "User Type is required."],
    indexedDB: true,
  },
  dept_name: {
    type: String,
    required: [true, "Department Name is required."],
    indexedDB: true,
  },
  dept_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Department ID is Required"],
    ref: "department",
  },
  approver_user_name: {
    type: String,
    required: [true, "Approver User Name is required."],
    indexedDB: true,
  },
  approver_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Role is Required"],
    ref: "roles",
  },
  first_name: {
    type: String,
    minlength: 1,
    maxlength: 25,
    required: true,
    trim: true,
    uppercase: true
  },
  last_name: {
    type: String,
    minlength: 1,
    maxlength: 25,
    required: true,
    trim: true,
    uppercase: true
  },
  age: {
    type: String,
    trim: true,
  },
  gender: {
    type: String,
    trim: true,
    uppercase: true
  },
  email_id: {
    type: String,
    trim: true,

  },
  pincode: {
    type: Number,
    trim: true,

  },
  mobile_no: {
    type: String,
    trim: true,
    default: null,
  },
  country_code: {
    type: String,
    trim: true,
    default: null,
  },
  address: {
    type: String,
    trim: true,

  },
  country: {
    type: String,
    trim: true,
    // uppercase: true
  },
  blood_group: {
    type: String,
    trim: true,
    uppercase: true
  },
  dob: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
    // uppercase: true
  },
  state: {
    type: String,
    trim: true,
    // uppercase: true
  },
  status: { type: Boolean, default: true },
  password: { type: String, default: null, trim: true },
  otp: { type: String, trim: true, default: null },
  verify_otp: { type: Boolean, default: false },
  otp_expiry_date: { type: String, trim: true, default: null },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: true,
    trim: true,
  },

  user_remarks: {
    type: String,
    uppercase: true,
    trim: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

UserSchema.methods.jwtToken = function (next) {
  try {
    return jwt.sign({ id: this._id, user_name: this.user_name }, Configs.jwt.accessSecret, {
      expiresIn: Configs.jwt.accessOptions.expiresIn || "24hr",
    });
  } catch (error) {
    return next(error);
  }
};

const UserModel = mongoose.model("user", UserSchema);
const lookup = [
  {
    $lookup: {
      from: "roles",
      localField: "role_id",
      foreignField: "_id",
      as: "role_id",
    },
  },
  {
    $unwind: {
      path: "$role_id",
      preserveNullAndEmptyArrays: true,
    },
  },
];
// LogSchemaFunction("user", UserModel, lookup);
export default UserModel;
