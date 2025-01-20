import mongoose from "mongoose";
import catchAsync from "../../../../utils/errors/catchAsync.js";
import ApiError from "../../../../utils/errors/apiError.js";
import { customer_client_model, customer_model } from "../../../../database/schema/masters/customer.schema.js";
import ApiResponse from "../../../../utils/ApiResponse.js";

export const addCustomerClient = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession()
    session.startTransaction();
    try {
        const { customer_id } = req.params

        if (!mongoose.isValidObjectId(customer_id)) {
            return next(new ApiError("Invalid customer id", 400));
        }

        const authUserDetail = req.userDetails;
        const customerClientData = req.body;

        const addedCustomerClient = await customer_client_model.create([customerClientData], { session })

        if (!addedCustomerClient?.[0]) {
            return next(new ApiError("Failed to add customer client", 400))
        }

        const updateCustomer = await customer_model.updateOne({ _id: customer_id }, {
            $set: {
                updated_by: authUserDetail?._id
            }
        }, { session })

        if (updateCustomer.matchedCount <= 0) {
            return next(new ApiError("Document not found", 404));
        }
        if (!updateCustomer.acknowledged || updateCustomer.modifiedCount <= 0) {
            return next(new ApiError("Failed to update document", 400));
        }

        await session.commitTransaction();

        const response = new ApiResponse(
            200,
            true,
            "Customer Client Added Successfully",
            addedCustomerClient?.[0]
        )

        return res.status(201).json(response)
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const editCustomerClient = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession()
    session.startTransaction();
    try {
        const { id } = req.params

        if (!mongoose.isValidObjectId(id)) {
            return next(new ApiError("Invalid customer id", 400));
        }

        const authUserDetail = req.userDetails;
        const customerClientData = {
            ...req.body,
            updated_by: authUserDetail?._id
        };

        const updateCustomerClient = await customer_client_model.updateOne({ _id: id }, {
            $set: customerClientData
        }, { session })

        if (updateCustomerClient.matchedCount <= 0) {
            return next(new ApiError("Document not found", 404));
        }
        if (!updateCustomerClient.acknowledged || updateCustomerClient.modifiedCount <= 0) {
            return next(new ApiError("Failed to update document", 400));
        }

        // update customer
        const updateCustomer = await customer_model.updateOne({ _id: customer_id }, {
            $set: {
                updated_by: authUserDetail?._id
            }
        }, { session })

        if (updateCustomer.matchedCount <= 0) {
            return next(new ApiError("Document not found", 404));
        }
        if (!updateCustomer.acknowledged || updateCustomer.modifiedCount <= 0) {
            return next(new ApiError("Failed to update document", 400));
        }

        await session.commitTransaction();

        const response = new ApiResponse(
            200,
            true,
            "Customer Client Update Successfully",
            updateCustomerClient
        )

        return res.status(201).json(response)
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const deleteCustomerClient = catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession()
    session.startTransaction();
    try {
        const { id } = req.params

        if (!mongoose.isValidObjectId(id)) {
            return next(new ApiError("Invalid customer id", 400));
        }

        const deleteCustomerClient = await customer_client_model.deleteOne({ _id: id }, { session })

        if (deleteCustomerClient.matchedCount <= 0) {
            return next(new ApiError("Document not found", 404));
        }
        if (!deleteCustomerClient.acknowledged || deleteCustomerClient.deletedCount <= 0) {
            return next(new ApiError("Failed to delete document", 400));
        }

        //update customer
        const updateCustomer = await customer_model.updateOne({ _id: customer_id }, {
            $set: {
                updated_by: authUserDetail?._id
            }
        }, { session })

        if (updateCustomer.matchedCount <= 0) {
            return next(new ApiError("Document not found", 404));
        }
        if (!updateCustomer.acknowledged || updateCustomer.modifiedCount <= 0) {
            return next(new ApiError("Failed to update document", 400));
        }

        await session.commitTransaction();

        const response = new ApiResponse(
            200,
            true,
            "Customer Client delete Successfully",
            deleteCustomerClient
        )

        return res.status(201).json(response)
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
});

export const fetchCustomerClientList = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sort = "desc",
    } = req.query;

    const { customer_id } = req.params

    if (!mongoose.isValidObjectId(customer_id)) {
        return next(new ApiError("Invalid customer id", 400));
    }

    // Aggregation stage
    const aggMatch = {
        customer_id:  mongoose.Types.ObjectId.createFromHexString(customer_id),
    }
    const aggSort = {
        $sort: {
            [sortBy]: sort === "desc" ? -1 : 1
        }
    }
    const aggSkip = {
        $skip: (parseInt(page) - 1) * parseInt(limit)
    }
    const aggLimit = {
        $limit: parseInt(limit)
    }

    const listAggregate = [
        aggMatch,
        aggSort,
        aggSkip,
        aggLimit
    ] // aggregation pipiline

    const customerClientData = await customer_client_model.aggregate(listAggregate);

    const totalDocument = await customer_client_model.countDocuments(aggMatch);

    const totalPages = Math.ceil((totalDocument || 0) / limit)

    const response = new ApiResponse(
        200,
        true,
        "Customer Client Data Fetched Successfully",
        {
            data: customerClientData,
            totalPages: totalPages
        }
    )
    return res.status(200).json(response)
});