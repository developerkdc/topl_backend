import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';
import Issue_For_Factory from './issue_for_factory.js';


export const add_issue_for_factory_data = catchAsync(async (req, res) => {
    const { issued_from, issue_details, add_to_factory, issued_for } = req.body;

    const userDetails = req.userDetails;

    const session = await mongoose.startSession();
    try {
        for (let field of ["issued_from", 'issue_details', 'add_to_factory', 'issued_for']) {
            if (!req.body[field]) {
                throw new ApiError(`${field} is missing.`, StatusCodes.BAD_REQUEST)
            }
        };
        session.startTransaction();
        const add_to_factory_handler = new Issue_For_Factory(session, userDetails, issued_from, issue_details, add_to_factory, issued_for);
        await add_to_factory_handler?.add_issued_items_to_factory();

        const response = new ApiResponse(StatusCodes.OK, "Item Issued Successfully");
        await session.commitTransaction();
        return res.status(StatusCodes.OK).json(response)
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
})