import { Router } from "express";
import issue_for_challan_router from "./issue_for_challan/issue_for_challan.routes.js";
import challan_done_router from "./challan_done/challan_done.routes.js";

const all_challan_router = Router();

//issue-for-challan
all_challan_router.use('/issue-for-challan', issue_for_challan_router);

//challan done
all_challan_router.use('/challan-done', challan_done_router);
export default all_challan_router