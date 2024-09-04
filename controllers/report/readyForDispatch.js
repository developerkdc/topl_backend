import mongoose from "mongoose";
import { GenerateReadyForDispatchReport } from "../../config/downloadExcel/report/readyForDispatch.js";
import catchAsync from "../../utils/errors/catchAsync.js";

export const ReadyForDispatchReportExcel = catchAsync(async (req, res, next) => {
    const {
        sortBy = "updated_at",
        sort = "desc",
    } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
        matchQuery["created_at"] = { $gte: new Date(from), $lte: new Date(to) };
    }

    const issuedForFinishingView = mongoose.connection.db.collection(
        "qc_done_inventories_view"
    );
    const issuedForFinishingData = await issuedForFinishingView
        .aggregate([
            {
                $match: {
                    ...matchQuery,
                },
            },
            {
                $sort: {
                    [sortBy]: sort == "desc" ? -1 : 1,
                },
            },
        ])
        .toArray();

    const exl = await GenerateReadyForDispatchReport(issuedForFinishingData)
    return res.status(200).json({
        result: exl,
        statusCode: 200,
        status: "success",
    });
});