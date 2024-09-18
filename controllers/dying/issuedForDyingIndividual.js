import catchAsync from "../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import { IssuedForDyingIndividualModel } from "../../database/schema/dying/issuedForDyingIndividual.js";

export const FetchIssuedForDyedIndividual = catchAsync(
  async (req, res, next) => {
    const { string, boolean, numbers ,arrayField=[]} = req?.body?.searchFields || {};
   const {
      page,
      limit = 10,
      sortBy = "updated_at",
      sort = "desc",
    } = req.query;
    const skip = Math.max((page - 1) * limit, 0);

    const search = req.query.search || "";

    let searchQuery = {};
    if (search != "" && req?.body?.searchFields) {
      const searchdata = DynamicSearch(search, boolean, numbers, string,arrayField);
     if (searchdata?.length == 0) {
        return res.status(404).json({
          statusCode: 404,
          status: false,
          data: {
            data: [],
          },
          message: "Results Not Found",
        });
      }
      searchQuery = searchdata;
    }

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      console.log(new Date(from));
      matchQuery["date_of_dying"] = { $gte: new Date(from) };
      matchQuery["date_of_dying"] = { $lte: new Date(to) };
    }

    const totalDocuments = await IssuedForDyingIndividualModel.countDocuments({
      ...matchQuery,
      ...searchQuery,
    });
    const totalPages = Math.ceil(totalDocuments / limit);

    const rawVeneerData = await IssuedForDyingIndividualModel.find({
      ...matchQuery,
      ...searchQuery,
    })
      .populate({
        path: "created_employee_id",
        select: "_id user_name first_name last_name",
      })
      .populate("item_details")
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sort })
      .exec();

    return res.status(200).json({
      result: rawVeneerData,
      statusCode: 200,
      status: "success",
      totalPages: totalPages,
    });
  }
);
