import { DynamicSearch } from '../dynamicSearch/dynamic.js';

const createEmptySearchFields = () => ({
  string: [],
  boolean: [],
  numbers: [],
  arrayField: [],
});

const normalizeJoinedFieldConfigs = (joinedFieldConfigs = []) =>
  joinedFieldConfigs.map((config, index) => ({
    key: config.key || config.prefix || `joined_${index}`,
    preserveNullAndEmptyArrays:
      config.preserveNullAndEmptyArrays === undefined
        ? true
        : config.preserveNullAndEmptyArrays,
    ...config,
  }));

const getFieldSource = (field = '', joinedFieldConfigs = []) => {
  const joinedConfig = joinedFieldConfigs.find((config) =>
    field?.startsWith(config.prefix)
  );

  if (!joinedConfig) {
    return {
      source: 'base',
      field,
    };
  }

  return {
    source: 'joined',
    field: joinedConfig.mapField
      ? joinedConfig.mapField(field.slice(joinedConfig.prefix.length), field)
      : field.slice(joinedConfig.prefix.length),
    config: joinedConfig,
  };
};

const splitFilterData = (filterData = {}, joinedFieldConfigs = []) => {
  const baseFilter = {};
  const joinedFilters = {};

  joinedFieldConfigs.forEach((config) => {
    joinedFilters[config.key] = {};
  });

  Object.entries(filterData || {}).forEach(([field, value]) => {
    const fieldSource = getFieldSource(field, joinedFieldConfigs);

    if (fieldSource.source === 'joined') {
      joinedFilters[fieldSource.config.key][fieldSource.field] = value;
      return;
    }

    baseFilter[fieldSource.field] = value;
  });

  return { baseFilter, joinedFilters };
};

const splitSearchFields = (searchFields = {}, joinedFieldConfigs = []) => {
  const baseSearchFields = createEmptySearchFields();
  const joinedSearchFields = {};

  joinedFieldConfigs.forEach((config) => {
    joinedSearchFields[config.key] = createEmptySearchFields();
  });

  const {
    string = [],
    boolean = [],
    numbers = [],
    arrayField = [],
  } = searchFields || {};

  [
    ['string', string],
    ['boolean', boolean],
    ['numbers', numbers],
    ['arrayField', arrayField],
  ].forEach(([fieldType, fields]) => {
    fields?.forEach((field) => {
      const fieldSource = getFieldSource(field, joinedFieldConfigs);

      if (fieldSource.source === 'joined') {
        joinedSearchFields[fieldSource.config.key][fieldType].push(
          fieldSource.field
        );
        return;
      }

      baseSearchFields[fieldType].push(fieldSource.field);
    });
  });

  return { baseSearchFields, joinedSearchFields };
};

const hasSearchFields = (searchFields = {}) =>
  Object.values(searchFields).some((fields) => fields?.length > 0);

const buildSearchQuery = (search = '', searchFields = {}) => {
  if (!search || !hasSearchFields(searchFields)) {
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

const serializeValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString();
  }

  return String(value);
};

export const orderDocumentsByIds = (documents = [], ids = [], idField = '_id') => {
  const documentMap = new Map(
    documents.map((document) => [serializeValue(document?.[idField]), document])
  );

  return ids
    .map((id) => documentMap.get(serializeValue(id)))
    .filter(Boolean);
};

const resolveJoinedDistinctValues = async (joinedFieldConfigs = [], queries = {}) =>
  Promise.all(
    joinedFieldConfigs.map(async (config) => {
      const query = queries?.[config.key];
      if (!query || Object.keys(query).length === 0) {
        return {
          config,
          hasQuery: false,
          values: null,
        };
      }

      const values = await config.model.distinct(config.foreignField, query);
      return {
        config,
        hasQuery: true,
        values,
      };
    })
  );

export const buildOptimizedListingContext = async ({
  search = '',
  searchFields = {},
  filterData = {},
  joinedFieldConfigs = [],
  staticMatch = {},
  sortBy = 'updatedAt',
} = {}) => {
  const normalizedJoinedFieldConfigs =
    normalizeJoinedFieldConfigs(joinedFieldConfigs);
  const trimmedSearch = search?.trim();

  const { baseFilter, joinedFilters } = splitFilterData(
    filterData,
    normalizedJoinedFieldConfigs
  );

  const matchQuery = {
    ...baseFilter,
    ...staticMatch,
  };

  const filterLookupResults = await resolveJoinedDistinctValues(
    normalizedJoinedFieldConfigs,
    joinedFilters
  );

  if (
    filterLookupResults.some(
      (result) => result.hasQuery && result.values?.length === 0
    )
  ) {
    return {
      noResults: true,
      searchMiss: false,
      matchQuery,
      sortFieldSource: getFieldSource(sortBy, normalizedJoinedFieldConfigs),
      joinedFieldConfigs: normalizedJoinedFieldConfigs,
    };
  }

  const andConditions = filterLookupResults
    .filter((result) => result.hasQuery && result.values?.length > 0)
    .map((result) => ({
      [result.config.localField]: { $in: result.values },
    }));

  if (trimmedSearch) {
    const { baseSearchFields, joinedSearchFields } = splitSearchFields(
      searchFields,
      normalizedJoinedFieldConfigs
    );

    const baseSearchQuery = buildSearchQuery(trimmedSearch, baseSearchFields);
    const joinedSearchQueries = {};

    normalizedJoinedFieldConfigs.forEach((config) => {
      joinedSearchQueries[config.key] = buildSearchQuery(
        trimmedSearch,
        joinedSearchFields[config.key]
      );
    });

    const joinedSearchLookupResults = await resolveJoinedDistinctValues(
      normalizedJoinedFieldConfigs,
      joinedSearchQueries
    );

    const searchConditions = [
      ...(baseSearchQuery?.$or || []),
      ...joinedSearchLookupResults
        .filter((result) => result.hasQuery && result.values?.length > 0)
        .map((result) => ({
          [result.config.localField]: { $in: result.values },
        })),
    ];

    if (searchConditions.length === 0) {
      return {
        noResults: false,
        searchMiss: true,
        matchQuery,
        sortFieldSource: getFieldSource(sortBy, normalizedJoinedFieldConfigs),
        joinedFieldConfigs: normalizedJoinedFieldConfigs,
      };
    }

    matchQuery.$or = searchConditions;
  }

  if (andConditions.length > 0) {
    matchQuery.$and = andConditions;
  }

  return {
    noResults: false,
    searchMiss: false,
    matchQuery,
    sortFieldSource: getFieldSource(sortBy, normalizedJoinedFieldConfigs),
    joinedFieldConfigs: normalizedJoinedFieldConfigs,
  };
};

export const runOptimizedPaginatedListing = async ({
  model,
  page = 1,
  limit = 10,
  sortBy = 'updatedAt',
  sort = 'desc',
  search = '',
  searchFields = {},
  filterData = {},
  joinedFieldConfigs = [],
  staticMatch = {},
  hydratePipelineBuilder,
  allowDiskUse = true,
} = {}) => {
  const context = await buildOptimizedListingContext({
    search,
    searchFields,
    filterData,
    joinedFieldConfigs,
    staticMatch,
    sortBy,
  });

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageLimit = Math.max(parseInt(limit, 10) || 10, 1);
  const sortDirection = sort === 'desc' ? -1 : 1;

  if (context.searchMiss) {
    return {
      ...context,
      data: [],
      totalCount: 0,
      totalPages: 0,
      pageIds: [],
    };
  }

  if (context.noResults) {
    return {
      ...context,
      data: [],
      totalCount: 0,
      totalPages: 0,
      pageIds: [],
    };
  }

  const totalCount = await model.countDocuments(context.matchQuery);
  const totalPages = Math.ceil(totalCount / pageLimit);

  if (totalCount === 0) {
    return {
      ...context,
      data: [],
      totalCount,
      totalPages,
      pageIds: [],
    };
  }

  const pageIdsPipeline = [{ $match: context.matchQuery }];

  if (context.sortFieldSource.source === 'joined') {
    const sortConfig = context.sortFieldSource.config;
    const sortLookup = {
      $lookup: {
        from: sortConfig.model.collection.name,
        localField: sortConfig.localField,
        foreignField: sortConfig.foreignField,
        as: '__sort_join__',
      },
    };

    if (sortConfig.sortLookupPipeline?.length) {
      sortLookup.$lookup.pipeline = sortConfig.sortLookupPipeline;
    }

    pageIdsPipeline.push(
      sortLookup,
      {
        $unwind: {
          path: '$__sort_join__',
          preserveNullAndEmptyArrays: sortConfig.preserveNullAndEmptyArrays,
        },
      },
      {
        $sort: {
          [`__sort_join__.${context.sortFieldSource.field}`]: sortDirection,
          _id: sortDirection,
        },
      }
    );
  } else {
    pageIdsPipeline.push({
      $sort: {
        [sortBy]: sortDirection,
        _id: sortDirection,
      },
    });
  }

  pageIdsPipeline.push(
    { $skip: (pageNumber - 1) * pageLimit },
    { $limit: pageLimit },
    { $project: { _id: 1 } }
  );

  const pageIdDocuments = allowDiskUse
    ? await model.aggregate(pageIdsPipeline).allowDiskUse(true)
    : await model.aggregate(pageIdsPipeline);

  const pageIds = pageIdDocuments.map((document) => document?._id);

  if (pageIds.length === 0) {
    return {
      ...context,
      data: [],
      totalCount,
      totalPages,
      pageIds,
    };
  }

  const hydratePipeline = hydratePipelineBuilder
    ? hydratePipelineBuilder(pageIds)
    : [{ $match: { _id: { $in: pageIds } } }];

  const hydratedDocuments = allowDiskUse
    ? await model.aggregate(hydratePipeline).allowDiskUse(true)
    : await model.aggregate(hydratePipeline);

  return {
    ...context,
    data: orderDocumentsByIds(hydratedDocuments, pageIds),
    totalCount,
    totalPages,
    pageIds,
  };
};
