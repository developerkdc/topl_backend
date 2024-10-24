import ApprovalConfigModel from "../database/schema/ApprovalConfig/approvalConfig.schema.js";
import catchAsync from "../utils/errors/catchAsync.js";

export const verifyApproval = function (module, action) {
    return catchAsync(async (req, res, next) => {
        const users = req.userDetails;
        const configuration = await ApprovalConfigModel.findOne();
        req.sendForApproval = false;
        if (configuration?.[module] && configuration?.[module]?.[action]) {
            if (users.user_type === "ADMIN" && users.approver_user_name === "Self Approved" && !users.approver_id) {
                req.sendForApproval = false;
                next();
            } else if (users.user_type === "STAFF" && users.approver_user_name !== "Self Approved" && users.approver_id) {
                req.sendForApproval = true;
                next();
            }
        }
        next();
    })
}