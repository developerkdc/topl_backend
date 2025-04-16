import { Router } from "express";
import AuthMiddleware from '../../../middlewares/verifyToken.js';
import { add_issue_for_challan_data, revert_issued_challan_data_by_id } from "../../../controllers/challan/issue_for_challan/issue_for_challan.controller.js";
const issue_for_challan_router = Router();

issue_for_challan_router.post("/issue", AuthMiddleware, add_issue_for_challan_data);
issue_for_challan_router.post("/revert/:id", AuthMiddleware, revert_issued_challan_data_by_id);
export default issue_for_challan_router;