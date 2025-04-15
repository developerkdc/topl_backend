import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import Revert_Issued_Factory_Item from './revert_issue_for_factory.js';

export const revert_issue_for_factory_data = catchAsync(async (req, res) => {
    const { id, revert_from_factory } = req.query;

    const userDetails = req.userDetails;
    if (!id) {
        throw new ApiError('ID is missing.', StatusCodes.NOT_FOUND);
    }
    if (!revert_from_factory) {
        throw new ApiError('Revert from factory is missing', StatusCodes.NOT_FOUND);
    }
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const revert_factory_handler = new Revert_Issued_Factory_Item(
            id,
            session,
            userDetails,
            revert_from_factory
        );
        await revert_factory_handler?.revert_item_from_factory();
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
        await session.endSession();
    }
});
