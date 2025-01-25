import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken";
import { addIssueForPeeling } from "../../../controllers/factory/peeling/issue_for_peeling.controller";
const issueForPeelingRouter = express.Router();

issueForPeelingRouter.post("add-issue-for-peeling/:log_inventory_item_id",AuthMiddleware,addIssueForPeeling)

export default issueForPeelingRouter;