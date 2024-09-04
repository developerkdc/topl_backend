import express from "express";
import { ChangeAuthUserPassword, GetAuthUser, UpdateAuthUserProfile } from "../controllers/profile.js";
import CheckRoleAndTokenAccess from "../middlewares/permission.js";




const router = express.Router();


router.post("/update-user-profile",CheckRoleAndTokenAccess,UpdateAuthUserProfile);
router.patch("/change-password",CheckRoleAndTokenAccess,ChangeAuthUserPassword);
router.get("/list-user-profile",CheckRoleAndTokenAccess,GetAuthUser);


export default router;