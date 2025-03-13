import express from "express";
import { issue_for_tapping_from_grouping_for_stock_and_sample } from "../../../../controllers/factory/tapping/issue_for_tapping/issue_for_tapping.controller.js";
import AuthMiddleware from "../../../../middlewares/verifyToken.js";

const issue_for_tapping_router = express.Router();

issue_for_tapping_router.post(
    "/issue-for-tapping-stock-sample/:grouping_done_item_id",
    AuthMiddleware,
    issue_for_tapping_from_grouping_for_stock_and_sample
)

export default issue_for_tapping_router