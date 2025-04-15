import { Router } from "express";
import issue_for_challan_router from "./issue_for_challan/issue_for_challan.routes.js";

const all_challan_router = Router();

//issue-for-challan
all_challan_router.use('/issue-for-challan', issue_for_challan_router);

//challan done
export default all_challan_router