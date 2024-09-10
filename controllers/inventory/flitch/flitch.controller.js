import mongoose from "mongoose";
import { flitch_inventory_invoice_details, flitch_inventory_items_details, } from "../../../database/schema/inventory/Flitch/flitch.schema";
import catchAsync from "../../../utils/errors/catchAsync";
import ApiError from "../../../utils/errors/apiError";

export const listing_flitch_inventory = catchAsync(async (req,res,next)=>{
    const { page = 1, limit = 10, sortBy = "updated_at", sort = "desc" } = req.query;

    const List_flitch_inventory_details = await flitch_inventory_items_details.aggregate([
        {
            $skip: (parseInt(page) - 1) * parseInt(limit)
        },
        {
            $limit:parseInt(limit)
        },
        {
            $lookup:{
                from: "flitch_inventory_invoice_details",
                localField:"invoice_id",
                foreignField: "invoice_id",
                as: "flitch_invoice_details"
            }
        }
    ])
})

export const add_flitch_inventory = catchAsync(async (req, res, next) => {
    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        const { inventory_invoice_details, inventory_items_details } = req.body;

        const add_invoice_details = await flitch_inventory_invoice_details.create([{
            ...inventory_invoice_details
        }], { session });

        if (add_invoice_details && add_invoice_details?.length < 0) {
            return next(new ApiError("Failed to add invoice", 400))
        }

        const invoice_details_id = add_invoice_details?.[0]?._id;
        const items_details = inventory_items_details?.map((elm) => {
            elm.invoice_id = invoice_details_id;
            return elm
        })

        const add_items_details = await flitch_inventory_items_details.insertMany(items_details, {
            session
        })

        if (add_items_details && add_items_details?.length < 0) {
            return next(new ApiError("Failed to add Items Details", 400))
        }

        session.commitTransaction();
        session.endSession()
        return res.status(201).json({
            statusCode: 201,
            status: "Created",
            data: {
                add_invoice_details,
                add_items_details
            },
            message: "Inventory has added successfully"
        })
    } catch (error) {
        await session.abortTransaction();
        session.endSession()
        return next(error);
    }
})

export const edit_flitch_inventory = catchAsync(async (req, res, next) => {
    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        const item_id = req.params?.item_id;
        const invoice_id = req.params?.invoice_id;
        const item_details = req.body?.item_details;
        const invoice_details = req.body?.invoice_details;

        const update_item_details = await flitch_inventory_items_details.updateOne({ _id: item_id }, {
            $set: item_details
        },{session});

        if(!update_item_details?.acknowledged && update_item_details?.modifiedCount <= 0){
            return next(new ApiError("Failed to update item details",400))
        }

        const update_voice_details = await flitch_inventory_invoice_details.updateOne({ _id: invoice_id }, {
            $set: invoice_details
        },{session});

        if(!update_voice_details?.acknowledged && update_voice_details?.modifiedCount <= 0){
            return next(new ApiError("Failed to update item details",400))
        }

        session.commitTransaction();
        session.endSession()
        return res.status(200).json({
            statusCode: 200,
            status: "Updated",
            data: {
                update_item_details,
                update_voice_details
            },
            message: "Inventory has updated successfully"
        })
    } catch (error) {
        await session.abortTransaction();
        session.endSession()
        return next(error);
    }
})