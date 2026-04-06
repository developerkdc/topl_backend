const parsePositiveInt = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
};

const buildSortStage = ({ sortBy = 'updatedAt', sort = 'desc', includeIdSort }) => {
  const sortOrder = sort === 'asc' ? 1 : -1;
  const stage = {
    [sortBy]: sortOrder,
  };

  if (includeIdSort) {
    stage._id = sortOrder;
  }

  return stage;
};

const buildJoinStages = ({
  invoiceCollectionName,
  invoiceAlias,
  includeCreatedUserLookup,
  createdUserAlias,
}) => {
  const stages = [
    {
      $lookup: {
        from: invoiceCollectionName,
        localField: 'invoice_id',
        foreignField: '_id',
        as: invoiceAlias,
      },
    },
    {
      $unwind: {
        path: `$${invoiceAlias}`,
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (includeCreatedUserLookup) {
    stages.push(
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: createdUserAlias,
        },
      },
      {
        $unwind: {
          path: `$${createdUserAlias}`,
          preserveNullAndEmptyArrays: true,
        },
      }
    );
  }

  return stages;
};

export const getPaginatedInventoryListingWithViewFallback = async ({
  viewModel,
  baseModel,
  invoiceCollectionName,
  invoiceAlias,
  matchQuery = {},
  sortBy = 'updatedAt',
  sort = 'desc',
  page = 1,
  limit = 10,
  includeIdSort = false,
  includeCreatedUserLookup = true,
  createdUserAlias = 'created_user',
}) => {
  const pageNumber = parsePositiveInt(page, 1);
  const limitNumber = parsePositiveInt(limit, 10);
  const sortStage = buildSortStage({ sortBy, sort, includeIdSort });

  const viewListPipeline = [
    {
      $match: matchQuery,
    },
    {
      $sort: sortStage,
    },
    {
      $skip: (pageNumber - 1) * limitNumber,
    },
    {
      $limit: limitNumber,
    },
  ];

  let viewData = [];
  let viewTotalItems = 0;

  try {
    viewData = await viewModel.aggregate(viewListPipeline);
    viewTotalItems = await viewModel.countDocuments(matchQuery);
  } catch (error) {
    viewData = [];
    viewTotalItems = 0;
  }

  if (viewData.length > 0 || viewTotalItems > 0) {
    return {
      data: viewData,
      totalItems: viewTotalItems,
      totalPage: Math.ceil(viewTotalItems / limitNumber),
      usedFallback: false,
    };
  }

  const joinStages = buildJoinStages({
    invoiceCollectionName,
    invoiceAlias,
    includeCreatedUserLookup,
    createdUserAlias,
  });

  const fallbackListPipeline = [
    ...joinStages,
    {
      $match: matchQuery,
    },
    {
      $sort: sortStage,
    },
    {
      $skip: (pageNumber - 1) * limitNumber,
    },
    {
      $limit: limitNumber,
    },
  ];

  const fallbackCountPipeline = [
    ...joinStages,
    {
      $match: matchQuery,
    },
    {
      $count: 'totalItems',
    },
  ];

  const [fallbackData, fallbackCount] = await Promise.all([
    baseModel.aggregate(fallbackListPipeline),
    baseModel.aggregate(fallbackCountPipeline),
  ]);

  const fallbackTotalItems = fallbackCount?.[0]?.totalItems || 0;

  return {
    data: fallbackData,
    totalItems: fallbackTotalItems,
    totalPage: Math.ceil(fallbackTotalItems / limitNumber),
    usedFallback: true,
  };
};
