import UserModel from '../../database/schema/user.schema.js';
import { dynamic_filter } from '../dymanicFilter.js';
import {
  runOptimizedPaginatedListing,
} from './runOptimizedPaginatedListing.js';

const buildCreatedUserLookupStages = (createdUserAlias = 'created_user') => [
  {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            _id: 1,
            user_name: 1,
            first_name: 1,
            last_name: 1,
          },
        },
      ],
      as: createdUserAlias,
    },
  },
  {
    $unwind: {
      path: `$${createdUserAlias}`,
      preserveNullAndEmptyArrays: true,
    },
  },
];

export const runInventoryListingPagination = async ({
  itemsModel,
  invoiceModel,
  invoiceAlias,
  createdUserAlias = 'created_user',
  invoicePrefixes = [],
  createdUserPrefix,
  staticMatch = {},
  req,
}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const filterData = dynamic_filter(req.body?.filter);
  const resolvedCreatedUserPrefix = createdUserPrefix || `${createdUserAlias}.`;
  const lookupStages = [
    {
      $lookup: {
        from: invoiceModel.collection.name,
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
    ...buildCreatedUserLookupStages(createdUserAlias),
  ];

  const joinedFieldConfigs = [
    ...invoicePrefixes.map((prefixConfig) => ({
      key: prefixConfig.key || prefixConfig.prefix,
      prefix: prefixConfig.prefix,
      model: invoiceModel,
      localField: 'invoice_id',
      foreignField: '_id',
      ...(prefixConfig.mapField ? { mapField: prefixConfig.mapField } : {}),
    })),
    {
      key: resolvedCreatedUserPrefix,
      prefix: resolvedCreatedUserPrefix,
      model: UserModel,
      localField: 'created_by',
      foreignField: '_id',
    },
  ];

  return runOptimizedPaginatedListing({
    model: itemsModel,
    page,
    limit,
    sortBy,
    sort,
    search,
    searchFields: req.body?.searchFields,
    filterData,
    staticMatch,
    joinedFieldConfigs,
    hydratePipelineBuilder: (pageIds) => [
      {
        $match: {
          _id: { $in: pageIds },
        },
      },
      ...lookupStages,
    ],
  });
};

const buildHistoryUserLookupStages = () => [
  {
    $lookup: {
      from: 'users',
      localField: 'created_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
            email_id: 1,
          },
        },
      ],
      as: 'created_user_details',
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'updated_by',
      foreignField: '_id',
      pipeline: [
        {
          $project: {
            first_name: 1,
            last_name: 1,
            user_name: 1,
            user_type: 1,
          },
        },
      ],
      as: 'updated_user_details',
    },
  },
  {
    $unwind: {
      path: '$created_user_details',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $unwind: {
      path: '$updated_user_details',
      preserveNullAndEmptyArrays: true,
    },
  },
];

export const runInventoryHistoryPagination = async ({
  historyModel,
  itemViewModel,
  itemLocalField,
  itemAlias,
  req,
  itemLookupPipeline = [],
  staticMatch = {},
}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'updatedAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const filterData = dynamic_filter(req.body?.filter);

  return runOptimizedPaginatedListing({
    model: historyModel,
    page,
    limit,
    sortBy,
    sort,
    search,
    searchFields: req.body?.searchFields,
    filterData,
    staticMatch,
    joinedFieldConfigs: [
      {
        key: itemAlias,
        prefix: `${itemAlias}.`,
        model: itemViewModel,
        localField: itemLocalField,
        foreignField: '_id',
      },
      {
        key: 'created_user_details',
        prefix: 'created_user_details.',
        model: UserModel,
        localField: 'created_by',
        foreignField: '_id',
      },
      {
        key: 'updated_user_details',
        prefix: 'updated_user_details.',
        model: UserModel,
        localField: 'updated_by',
        foreignField: '_id',
      },
    ],
    hydratePipelineBuilder: (pageIds) => [
      {
        $match: {
          _id: { $in: pageIds },
        },
      },
      {
        $lookup: {
          from: itemViewModel.collection.name,
          foreignField: '_id',
          localField: itemLocalField,
          as: itemAlias,
          ...(itemLookupPipeline?.length
            ? { pipeline: itemLookupPipeline }
            : {}),
        },
      },
      {
        $unwind: {
          path: `$${itemAlias}`,
          preserveNullAndEmptyArrays: true,
        },
      },
      ...buildHistoryUserLookupStages(),
    ],
  });
};
