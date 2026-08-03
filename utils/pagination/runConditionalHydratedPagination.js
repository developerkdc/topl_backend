import { DynamicSearch } from '../dynamicSearch/dynamic.js';
import { dynamic_filter } from '../dymanicFilter.js';
import { orderDocumentsByIds } from './runOptimizedPaginatedListing.js';

const startsWithAnyPrefix = (field = '', prefixes = []) =>
  prefixes.some((prefix) => field?.startsWith(prefix));

const hasAnySearchFields = (searchFields = {}) =>
  Object.values(searchFields).some((fields) => fields?.length > 0);

const buildSearchQuery = (search = '', searchFields = {}) => {
  if (!search || !hasAnySearchFields(searchFields)) {
    return null;
  }

  const searchQuery = DynamicSearch(
    search,
    searchFields.boolean,
    searchFields.numbers,
    searchFields.string,
    searchFields.arrayField
  );

  return searchQuery?.$or?.length ? searchQuery : null;
};

export const runConditionalHydratedPagination = async ({
  model,
  hydrateModel = model,
  req,
  staticMatch = {},
  joinedFieldPrefixes = [],
  hydratePipelineBuilder,
  fallbackRunner,
  allowDiskUse = true,
}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const searchFields = req.body?.searchFields || {};
  const filterData = dynamic_filter(req.body?.filter);
  const trimmedSearch = search?.trim();
  const fullSearchQuery = buildSearchQuery(trimmedSearch, searchFields);

  const joinedFieldQueryRequired =
    (trimmedSearch !== '' &&
      Object.values(searchFields).some((fields) =>
        fields?.some((field) => startsWithAnyPrefix(field, joinedFieldPrefixes))
      )) ||
    startsWithAnyPrefix(sortBy, joinedFieldPrefixes) ||
    Object.keys(filterData || {}).some((field) =>
      startsWithAnyPrefix(field, joinedFieldPrefixes)
    );

  if (joinedFieldQueryRequired) {
    return fallbackRunner({
      page,
      limit,
      pageNumber: Math.max(parseInt(page, 10) || 1, 1),
      pageLimit: Math.max(parseInt(limit, 10) || 10, 1),
      sortBy,
      sort,
      search,
      searchFields,
      filterData,
      searchQuery: fullSearchQuery,
      matchQuery: {
        ...filterData,
        ...(fullSearchQuery || {}),
        ...staticMatch,
      },
    });
  }

  if (trimmedSearch !== '' && !fullSearchQuery) {
    return {
      searchMiss: true,
      data: [],
      totalPages: 0,
    };
  }

  const matchQuery = {
    ...filterData,
    ...(fullSearchQuery || {}),
    ...staticMatch,
  };

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageLimit = Math.max(parseInt(limit, 10) || 10, 1);
  const sortDirection = sort === 'desc' ? -1 : 1;

  const totalCount = await model.countDocuments(matchQuery);
  const totalPages = Math.ceil(totalCount / pageLimit);

  if (totalCount === 0) {
    return {
      searchMiss: false,
      data: [],
      totalPages,
    };
  }

  const pageIdsPipeline = [
    { $match: matchQuery },
    {
      $sort: {
        [sortBy]: sortDirection,
        _id: sortDirection,
      },
    },
    { $skip: (pageNumber - 1) * pageLimit },
    { $limit: pageLimit },
    { $project: { _id: 1 } },
  ];

  const pageIdDocuments = allowDiskUse
    ? await model.aggregate(pageIdsPipeline).allowDiskUse(true)
    : await model.aggregate(pageIdsPipeline);

  const pageIds = pageIdDocuments.map((document) => document?._id);

  if (pageIds.length === 0) {
    return {
      searchMiss: false,
      data: [],
      totalPages,
    };
  }

  const hydratePipeline = hydratePipelineBuilder(pageIds);
  const hydratedDocuments = allowDiskUse
    ? await hydrateModel.aggregate(hydratePipeline).allowDiskUse(true)
    : await hydrateModel.aggregate(hydratePipeline);

  return {
    searchMiss: false,
    data: orderDocumentsByIds(hydratedDocuments, pageIds),
    totalPages,
  };
};
