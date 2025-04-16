import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import IssueForChallan from './issue_for_challan.js';
import RevertIssueForChallan from './revert_issue_for_challan.js';
import issue_for_challan_model from '../../../database/schema/challan/issue_for_challan/issue_for_challan.schema.js';


export const add_issue_for_challan_data = catchAsync(async (req, res) => {
    const { issued_from, issued_item_ids, issued_data = null } = req.body;
    const userDetails = req.userDetails
    const required_fields = ['issued_from', 'issued_item_ids'];
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

export const revert_issued_challan_data_by_id = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userDetails = req.userDetails;

    if (!id) {
        throw new ApiError('ID not found', StatusCodes.NOT_FOUND);
    }
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const revert_issued_challan_handler = new RevertIssueForChallan(id, userDetails, session);
        await revert_issued_challan_handler?.update_inventory_item_status()
        const delete_order_item_doc_result = await issue_for_challan_model.deleteOne(
            { _id: id },
            { session: session }
        );
        if (
            !delete_order_item_doc_result.acknowledged ||
            delete_order_item_doc_result.deletedCount === 0
        ) {
            throw new ApiError(
                'Failed to Delete issue for challan data',
                StatusCodes.BAD_REQUEST
            );
        }

        const response = new ApiResponse(
            StatusCodes.OK,
            'Item Reverted Successfully'
        );
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session?.endSession();
    }
});