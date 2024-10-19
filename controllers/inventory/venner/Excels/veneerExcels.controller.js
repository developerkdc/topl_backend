import catchAsync from "../../../../utils/errors/catchAsync.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import { StatusCodes } from "../../../../utils/constants.js";

export const downloadVeneerExcelFormat = catchAsync(async (req, res, next) => {
    const destinationPath = `public/upload/downloadFormat/veneer.xlsx`;

    const link = `${process.env.APP_URL}${destinationPath}`;
    return res.json(
        new ApiResponse(StatusCodes.OK, "download format successfully...", link)
    );
})