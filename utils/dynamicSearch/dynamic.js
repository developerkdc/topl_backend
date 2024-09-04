export const DynamicSearch = (search, boolean, numbers, string, arrayField) => {
  if (search != "") {
    let dynamicSearchQueries = [];
    let object = [...string, ...numbers];
    let array = [...arrayField];
    object?.length > 0 &&
      object?.map((field) => {
        dynamicSearchQueries.push({
          $expr: {
            $regexMatch: {
              input: { $toString: `$${field}` },
              regex: new RegExp(search.toString()),
              options: "i",
            },
          },
        });
      });

    array?.length > 0 &&
      array?.map((field) => {
        dynamicSearchQueries.push({
          [field]: { $regex: search, $options: "i" },
        });
      });

    const searchQuery =
      dynamicSearchQueries?.length > 0 ? { $or: dynamicSearchQueries } : [];

    return searchQuery;
  } else {
    return [];
  }
};
