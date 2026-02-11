import challan_done_model from "../../../database/schema/challan/challan_done/challan_done.schema.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { ChallanJSONtoXML } from "../../../utils/tally-utils/TallyMapperChallan.js";
import { sendToTally } from "../../../utils/tally-utils/TallyService.js";
import mongoose from "mongoose";

export const challan_tally = catchAsync(async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const matchquery = {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(id),
            },
        };
        const aggIssuedChallanDetailsLookup = {
            $lookup: {
                from: 'issue_for_challan_details',
                localField: 'raw_material_items',
                foreignField: '_id',
                as: 'issue_for_challan_item_details',
            },
        };
        const aggCustomerDetailsLookup = {
            $lookup: {
                from: 'customers',
                localField: 'customer_id',
                foreignField: '_id',
                as: 'customer_details',
            },
        };

        const aggCustomerDetailsUnwind = {
            $unwind: {
                path: '$customer_details',
                preserveNullAndEmptyArrays: true,
            },
        };

        const listAggregate = [
            matchquery,
            aggIssuedChallanDetailsLookup,
            aggCustomerDetailsLookup,
            aggCustomerDetailsUnwind,

        ]; // aggregation pipiline

        const result = await challan_done_model.aggregate(listAggregate);
        const challan = result[0];
        if (!challan) return res.status(404).json({ error: "Challan not found" });
        const xml = ChallanJSONtoXML(challan);

        if (!xml)
            return res.status(500).json({ error: "XML generation failed" });

        const response = await sendToTally(xml);
        // console.log("Tally Response:", response);
        res.status(200).json({
            success: true,
            message: "Challan pushed to Tally",
            response,
        });
    } catch (err) {
        next(err);
    }
});

