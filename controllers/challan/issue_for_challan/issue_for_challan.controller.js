import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import IssueForChallan from './issue_for_challan.js';


export const add_issue_for_challan_data = catchAsync(async (req, res) => {
    const { issued_from, issued_item_ids, issued_data } = req.body;
    const userDetails = req.userDetails
    const required_fields = ['issued_from', 'issued_item_id'];
    for (let field of required_fields) {
        if (!req.body[field]) {
            throw new ApiError(`${field} is missing..`, StatusCodes.NOT_FOUND)
        }
    };

    if (issued_item_ids?.length === 0) {
        throw new ApiError('Issued item must have at least one item', StatusCodes.BAD_REQUEST)
    };
    const session = await mongoose.startSession()
    try {
        session.startTransaction();
        const issue_for_challan_handler = new IssueForChallan(session, userDetails, issued_from, issued_item_ids, issued_data);

        await issue_for_challan_handler?.add_issue_data_to_challan();

        const response = new ApiResponse(StatusCodes.OK, "Items issued for challan successfully");
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)
    } catch (error) {
        await session.endSession();
        throw error
    } finally {
        await session.endSession()
    }



})