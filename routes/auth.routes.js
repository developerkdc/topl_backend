import express from "express";
import { ForgetPassword, ResetPassword, SignIn, VerifyOtp } from "../controllers/auth.js";

const router = express.Router();

router.post("/signin", SignIn);
router.post("/forget-password",ForgetPassword);
router.post("/verify-otp",VerifyOtp);
router.post("/reset-password",ResetPassword);


export default router;
