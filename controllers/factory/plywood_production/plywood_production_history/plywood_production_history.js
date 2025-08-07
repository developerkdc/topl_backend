import { dynamic_filter } from '../../../../utils/dymanicFilter.js';
import { DynamicSearch } from '../../../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import plywood_production_history_model from '../../../../database/schema/factory/plywood_production/plywood_production_history.schema.js';
import { plywood_production_model } from '../../../../database/schema/factory/plywood_production/plywood_production.schema.js';
import ApiResponse from '../../../../utils/ApiResponse.js';

export const listing_plywood_production_history = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = '_id',
    sort = 'desc',
    search = '',
  } = req.query;
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const filter = req.body?.filter;

  let search_query = {};
  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  //Aggregation stage
  // const aggCommonMatch = {
  //   $match: {
  //     'available_details.no_of_sheets': { $ne: 0 },
  //   },
  // };

  const aggCreatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'created_by',
    },
  };

  const aggPlywoodDoneLookup = {
    $lookup: {
      from: 'plywood_production',
      localField: 'plywood_production_done_id',
      foreignField: '_id',
      as: 'production_done_details',
    },
  };

  const aggPlywoodDoneUnwind = {
    $unwind: {
      path: '$production_done_details',
      preserveNullAndEmptyArrays: true,
    },
  };

  const aggUpdatedByLookup = {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'updated_by',
    },
  };
  const aggCreatedByUnwind = {
    $unwind: {
      path: '$created_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggUpdatedByUnwind = {
    $unwind: {
      path: '$updated_by',
      preserveNullAndEmptyArrays: true,
    },
  };
  const aggMatch = {
    $match: {
      ...match_query,
    },
  };
  const aggSort = {
    $sort: {
      [sortBy]: sort === 'desc' ? -1 : 1,
    },
  };
  const aggSkip = {
    $skip: (parseInt(page) - 1) * parseInt(limit),
  };
  const aggLimit = {
    $limit: parseInt(limit),
  };
  const aggSortByCreatedAt = {
    $sort: {
      plywood_production_done_id: 1,
      createdAt: -1,
    },
  };
  const aggGroupByResizingDoneId = {
    $group: {
      _id: '$plywood_production_done_id',
      doc: { $first: '$$ROOT' },
    },
  };
  const aggReplaceRoot = {
    $replaceRoot: {
      newRoot: '$doc',
    },
  };

  const listAggregate = [
    // aggCommonMatch,
    aggSortByCreatedAt,
    aggGroupByResizingDoneId,
    aggReplaceRoot,
    aggCreatedByLookup,
    aggPlywoodDoneLookup,
    aggPlywoodDoneUnwind,
    aggCreatedByUnwind,
    aggUpdatedByLookup,
    aggUpdatedByUnwind,
    aggLimit,
    aggMatch,
    aggSort,
    aggSkip,
  ]; // aggregation pipiline

  const plywood_history_list =
    await plywood_production_history_model.aggregate(listAggregate);

  const aggCount = {
    $count: 'totalCount',
  }; // count aggregation stage

  const totalAggregate = [...listAggregate?.slice(0, -2), aggCount]; // total aggregation pipiline

  const [totalDocument] =
    await plywood_production_history_model.aggregate(totalAggregate);

  const totalPages = Math.ceil((totalDocument?.totalCount || 0) / limit);

  const response = new ApiResponse(
    200,
    'Plywood History Data Fetched Successfully',
    {
      data: plywood_history_list,
      totalPages: totalPages,
    }
  );
  return res.status(200).json(response);
});

// export const listing_plywood_production_history = catchAsync(async (req, res, next) => {
//   const {
//     page = 1,
//     limit = 10,
//     sortBy = 'updatedAt',
//     sort = 'desc',
//     search = '',
//     mainSearch = '',
//   } = req.query;

//   const {
//     string = [],
//     boolean = [],
//     numbers = [],
//     arrayField = [],
//   } = req?.body?.searchFields || {};

//   const {
//     string: mainString = [],
//     boolean: mainBoolean = [],
//     numbers: mainNumbers = [],
//     arrayField: mainArrayField = [],
//   } = req?.body?.mainSearchFields || {};

//   const historyFilter = req.body?.filter?.history || {};
//   const mainFilter = req.body?.filter?.main || req.body?.filter || {};

//   // === Step 1: Get history filter & search ===
//   const historyFilterQuery = dynamic_filter(historyFilter);
//   const historySearchQuery = DynamicSearch(search, boolean, numbers, string, arrayField);

//   const finalHistoryQuery = {
//     ...historyFilterQuery,
//     ...(historySearchQuery?.$or?.length ? historySearchQuery : {}),
//   };

//   const matchedHistory = await plywood_production_history_model.find(finalHistoryQuery, {
//     plywood_production_done_id: 1,
//     _id: 0,
//   });

//   const doneIds = [
//     ...new Set(
//       matchedHistory
//         .map(doc => doc.plywood_production_done_id?.toString())
//         .filter(Boolean)
//     ),
//   ];

//   if (!doneIds.length) {
//     return res.status(200).json(
//       new ApiResponse(200, 'No matching records in history', {
//         data: [],
//         totalPages: 0,
//       })
//     );
//   }

//   // === Step 2: Apply main filter and get raw data ===
//   const mainFilterQuery = dynamic_filter(mainFilter);

//   const rawData = await plywood_production_model.find({
//     _id: { $in: doneIds },
//     ...mainFilterQuery,
//   });

//   // === Step 3: Apply in-memory DynamicSearch ===
//   let filteredData = [...rawData];

//   if (mainSearch && mainSearch.trim() !== '') {
//     const mainSearchQuery = DynamicSearch(mainSearch, mainBoolean, mainNumbers, mainString, mainArrayField);

//     if (mainSearchQuery?.$or?.length > 0) {
//       filteredData = rawData.filter(doc => {
//         return mainSearchQuery.$or.some(condition => {
//           // Handle $expr.$regexMatch
//           if (condition.$expr?.$regexMatch) {
//             const inputField = condition.$expr.$regexMatch.input?.$toString?.slice(1); // remove `$`
//             const regex = new RegExp(condition.$expr.$regexMatch.regex, condition.$expr.$regexMatch.options);
//             return regex.test(String(doc[inputField] || ''));
//           }

//           // Handle direct { field: { $regex } }
//           for (const [field, value] of Object.entries(condition)) {
//             if (value?.$regex) {
//               const regex = new RegExp(value.$regex, value.$options);
//               return regex.test(String(doc[field] || ''));
//             }
//           }

//           return false;
//         });
//       });
//     }
//   }

//   // === Step 4: Pagination ===
//   const totalDocs = filteredData.length;
//   const totalPages = Math.ceil(totalDocs / limit);
//   const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

//   return res.status(200).json(
//     new ApiResponse(200, 'Filtered Plywood Production Records from History and Main Model', {
//       data: paginatedData,
//       totalPages,
//     })
//   );
// });