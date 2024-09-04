export const DynamicSearch = (search, boolean, numbers, string) => {
  let searchFields = [];
  if (search != "") {
    if (search === "true" || search === "false") {
      searchFields = boolean;
    } else if (
      /\d/.test(search) &&
      /[a-z]/.test(search) != true &&
      /[A-Z]/.test(search) != true
    ) {
      searchFields = numbers;
    } else if (typeof search === "string") {
      searchFields = string;
    }

    const dynamicSearchQueries = searchFields?.map((field) => {
      if (search === "true" || search === "false") {
        return {
          [field]: search,
        };
      } else if (
        /\d/.test(search) &&
        /[a-z]/.test(search) != true &&
        /[A-Z]/.test(search) != true
      ) {
        return {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: `$${field}` },
                  regex: new RegExp(search.toString()),
                  options: "i",
                },
              },
            },
            { [field]: { $eq: search } },
          ],
        };
      } else if (typeof search === "string") {
        return {
          [field]: { $regex: search, $options: "i" },
        };
      }
    });

    const searchQuery =
      dynamicSearchQueries?.length > 0 ? { $or: dynamicSearchQueries } : [];

    return searchQuery;
  } else {
    return [];
  }
};


// export const DynamicSearch = (search, boolean, numbers, string) => {
//   if (search != "") {
//     const dynamicSearchQueries = [...string, ...numbers]?.map((field) => {
//       return {
//         $expr: {
//           $regexMatch: {
//             input: { $toString: `$${field}` },
//             regex: new RegExp(search.toString()),
//             options: "i",
//           },
//         },
//       };
//     });

//     const searchQuery =
//       dynamicSearchQueries?.length > 0 ? { $or: dynamicSearchQueries } : [];

//     return searchQuery;
//   } else {
//     return [];
//   }
// };
