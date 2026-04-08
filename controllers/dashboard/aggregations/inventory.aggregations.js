export const createInventoryAggregations = (context) => {
  const {
    mongoose,
    dispatch_status,
    order_status,
    ORDER_ITEM_COLLECTIONS,
    INVENTORY_SOURCES,
    INVENTORY_MODULE_LABELS,
    INVENTORY_QUANTITY_FIELD_LABELS,
    WIP_STAGES,
    THROUGHPUT_STAGES,
    YIELD_STAGES,
    DAMAGE_WASTAGE_STAGES,
    WIP_AGING_BUCKETS,
    INVENTORY_AGING_BUCKETS,
    FACTORY_PIPELINE_STAGES,
    FACTORY_STAGE_ORDER,
    FACTORY_SUBMODULE_CARD_SPECS,
    ORDER_CATEGORY_SOURCES,
    ORDER_TABLE_SOURCES,
    SUPPLIER_SOURCES,
    round2,
    formatStageLabel,
    asDate,
    dayStart,
    dayEnd,
    monthStart,
    monthKeyFromDate,
    endOfMonthFromKey,
    buildMonthKeys,
    buildYearMonthKeys,
    formatMonthLabel,
    resolveRange,
    resolveMonthRange,
    resolvePreviousMonthRange,
    normalizeTextFilter,
    resolveDashboardFilters,
    calculatePercentChange,
    collectUniqueOptions,
    filterInventorySources,
    escapeRegex,
    buildStringFieldFilter,
    buildContainsStringFieldFilter,
    combineMatch,
    normalizeOrderPriorityLabel,
    buildWastageContextMatch,
    buildInventoryContextMatch,
    buildInventorySourceSupplierMatches,
    dateMatch,
    safeAggregate,
    mergeMonthlyRows,
    sortedMonthly,
    sortedDaily,
    mergeDailyRows,
    aggregateDistinctStrings,
  } = context;

const aggregateInventoryTotals = async ({
  fromDate,
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
  asOf = true,
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const totals = {
    amount: 0,
    sqm: 0,
    sheets: 0,
    leaves: 0,
    rolls: 0,
    cmt: 0,
    quantity: 0,
    units: 0,
  };
  const rows = await Promise.all(
    sources.map(async (source) => {
      const sourceDateField = source.dateField || 'createdAt';
      const [summary] = await safeAggregate(source.collection, [
        {
          $match: combineMatch(
            asOf
              ? {
                  [sourceDateField]: {
                    $lte: toDate,
                  },
                }
              : dateMatch(sourceDateField, fromDate, toDate),
            asOf ? source.activeMatch : null,
            contextualMatch,
            supplierMatches.get(source.collection)
          ),
        },
        {
          $group: {
            _id: null,
            amount: { $sum: source.snapshotAmountExpr || source.amountExpr || 0 },
            sqm: { $sum: source.qtyBreakdown?.sqm || 0 },
            sheets: { $sum: source.qtyBreakdown?.sheets || 0 },
            leaves: { $sum: source.qtyBreakdown?.leaves || 0 },
            rolls: { $sum: source.qtyBreakdown?.rolls || 0 },
            cmt: { $sum: source.qtyBreakdown?.cmt || 0 },
            quantity: { $sum: source.qtyBreakdown?.quantity || 0 },
            units: { $sum: source.qtyBreakdown?.units || 0 },
          },
        },
      ]);
      return summary;
    })
  );

  rows.forEach((row) => {
    totals.amount += Number(row?.amount || 0);
    totals.sqm += Number(row?.sqm || 0);
    totals.sheets += Number(row?.sheets || 0);
    totals.leaves += Number(row?.leaves || 0);
    totals.rolls += Number(row?.rolls || 0);
    totals.cmt += Number(row?.cmt || 0);
    totals.quantity += Number(row?.quantity || 0);
    totals.units += Number(row?.units || 0);
  });

  return {
    amount: round2(totals.amount),
    sqm: round2(totals.sqm),
    sheets: round2(totals.sheets),
    leaves: round2(totals.leaves),
    rolls: round2(totals.rolls),
    cmt: round2(totals.cmt),
    quantity: round2(totals.quantity),
    units: round2(totals.units),
  };
};


const INVENTORY_CONTEXT_ITEM_FIELDS = [
  'item_name',
  'sales_item_name',
  'item_name.item_name',
  'item_details.item_name',
  'item_sub_category_name',
  'product_category',
  'raw_material',
];

const INVENTORY_CONTEXT_SERIES_FIELDS = [
  'series_name',
  'series_code',
  'series_product_code',
  'product_code',
  'series_name.series_name',
];

const INVENTORY_CONTEXT_GRADE_FIELDS = ['grade', 'grade_name', 'grades_name', 'grade_id.grade_name'];

const createEmptyInwardSummary = () => ({
  inwardAmount: 0,
  sqm: 0,
  sheets: 0,
  leaves: 0,
  rolls: 0,
  cmt: 0,
  quantity: 0,
  units: 0,
});

const normalizeInwardSummary = (summary = {}) => ({
  inwardAmount: Number(summary?.inwardAmount || 0),
  sqm: Number(summary?.sqm || 0),
  sheets: Number(summary?.sheets || 0),
  leaves: Number(summary?.leaves || 0),
  rolls: Number(summary?.rolls || 0),
  cmt: Number(summary?.cmt || 0),
  quantity: Number(summary?.quantity || 0),
  units: Number(summary?.units || 0),
});

const mergeInwardSummaries = (...summaries) =>
  summaries.reduce((acc, summary) => {
    const normalized = normalizeInwardSummary(summary);
    return {
      inwardAmount: Number(acc.inwardAmount || 0) + normalized.inwardAmount,
      sqm: Number(acc.sqm || 0) + normalized.sqm,
      sheets: Number(acc.sheets || 0) + normalized.sheets,
      leaves: Number(acc.leaves || 0) + normalized.leaves,
      rolls: Number(acc.rolls || 0) + normalized.rolls,
      cmt: Number(acc.cmt || 0) + normalized.cmt,
      quantity: Number(acc.quantity || 0) + normalized.quantity,
      units: Number(acc.units || 0) + normalized.units,
    };
  }, createEmptyInwardSummary());

const mapPrefixedFields = (fields = [], prefix = '') =>
  fields.map((field) => `${prefix}${field}`);

const buildInventoryContextMatchForPrefix = (filters = {}, prefix = '') =>
  combineMatch(
    buildStringFieldFilter(filters.itemName, mapPrefixedFields(INVENTORY_CONTEXT_ITEM_FIELDS, prefix)),
    buildStringFieldFilter(
      filters.series,
      mapPrefixedFields(INVENTORY_CONTEXT_SERIES_FIELDS, prefix)
    ),
    buildStringFieldFilter(filters.grade, mapPrefixedFields(INVENTORY_CONTEXT_GRADE_FIELDS, prefix))
  );

const buildInventoryInwardBasePipeline = ({
  source,
  fromDate,
  toDate,
  contextualMatch = null,
  sourceSupplierMatch = null,
}) => {
  const sourceDateField = source.dateField || 'createdAt';
  const invoiceLookupStages = source.invoiceCollection
    ? [
        {
          $lookup: {
            from: source.invoiceCollection,
            localField: 'invoice_id',
            foreignField: '_id',
            as: 'invoice_details',
          },
        },
        {
          $unwind: {
            path: '$invoice_details',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]
    : [];

  const effectiveDateExpr = source.invoiceCollection
    ? {
        $ifNull: ['$invoice_details.inward_date', `$${sourceDateField}`],
      }
    : `$${sourceDateField}`;

  return [
    {
      $match: combineMatch(contextualMatch, sourceSupplierMatch),
    },
    ...invoiceLookupStages,
    {
      $addFields: {
        effective_inventory_date: effectiveDateExpr,
      },
    },
    {
      $match: dateMatch('effective_inventory_date', fromDate, toDate),
    },
  ];
};

const buildHistorySupplierMatch = (sourceSupplierMatch = null, itemPrefix = 'history_item_details.') => {
  const invoiceCondition = sourceSupplierMatch?.invoice_id;
  if (!invoiceCondition) return null;
  return {
    [`${itemPrefix}invoice_id`]: invoiceCondition,
  };
};

const buildHistoryInwardBasePipeline = ({
  source,
  fromDate,
  toDate,
  filters = {},
  sourceSupplierMatch = null,
}) => {
  if (!source?.historyCollection) return null;

  const historyDateField = source.historyDateField || 'createdAt';
  const hasHistoryItemLookup = Boolean(source.historyItemCollection && source.historyItemIdField);
  const historyLookupStages = hasHistoryItemLookup
    ? [
        {
          $lookup: {
            from: source.historyItemCollection,
            localField: source.historyItemIdField,
            foreignField: '_id',
            as: 'history_item_details',
          },
        },
        {
          $unwind: {
            path: '$history_item_details',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]
    : [];

  const historyContextMatch = hasHistoryItemLookup
    ? buildInventoryContextMatchForPrefix(filters, 'history_item_details.')
    : buildInventoryContextMatch(filters);

  const historySupplierMatch = hasHistoryItemLookup
    ? buildHistorySupplierMatch(sourceSupplierMatch, 'history_item_details.')
    : sourceSupplierMatch;

  const includeMissingItemOnlyMatch =
    source.historyIncludeWhenItemMissing && hasHistoryItemLookup
      ? { 'history_item_details._id': { $exists: false } }
      : null;

  return [
    {
      $match: dateMatch(historyDateField, fromDate, toDate),
    },
    ...historyLookupStages,
    {
      $match: combineMatch(
        historyContextMatch,
        historySupplierMatch,
        includeMissingItemOnlyMatch
      ),
    },
  ];
};

const aggregateInventoryHistoryInwardSummary = async ({
  source,
  fromDate,
  toDate,
  filters = {},
  sourceSupplierMatch = null,
}) => {
  const basePipeline = buildHistoryInwardBasePipeline({
    source,
    fromDate,
    toDate,
    filters,
    sourceSupplierMatch,
  });
  if (!basePipeline) return createEmptyInwardSummary();

  const [summary] = await safeAggregate(source.historyCollection, [
    ...basePipeline,
    {
      $group: {
        _id: null,
        inwardAmount: { $sum: source.historyAmountExpr || 0 },
        sqm: { $sum: source.historyQtyBreakdown?.sqm || 0 },
        sheets: { $sum: source.historyQtyBreakdown?.sheets || 0 },
        leaves: { $sum: source.historyQtyBreakdown?.leaves || 0 },
        rolls: { $sum: source.historyQtyBreakdown?.rolls || 0 },
        cmt: { $sum: source.historyQtyBreakdown?.cmt || 0 },
        quantity: { $sum: source.historyQtyBreakdown?.quantity || 0 },
      },
    },
  ]);

  return normalizeInwardSummary(summary);
};

const aggregateInventoryHistoryInwardTrendRows = async ({
  source,
  fromDate,
  toDate,
  filters = {},
  sourceSupplierMatch = null,
}) => {
  const basePipeline = buildHistoryInwardBasePipeline({
    source,
    fromDate,
    toDate,
    filters,
    sourceSupplierMatch,
  });
  if (!basePipeline) return [];

  const historyDateField = source.historyDateField || 'createdAt';
  return safeAggregate(source.historyCollection, [
    ...basePipeline,
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: `$${historyDateField}` },
        },
        inwardValue: { $sum: source.historyAmountExpr || 0 },
      },
    },
  ]);
};


const aggregateInventoryInwardValue = async ({
  fromDate,
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const rows = await Promise.all(
    sources.map(async (source) => {
      const sourceSupplierMatch = supplierMatches.get(source.collection);
      const [summary, historySummary] = await Promise.all([
        safeAggregate(source.collection, [
          ...buildInventoryInwardBasePipeline({
            source,
            fromDate,
            toDate,
            contextualMatch,
            sourceSupplierMatch,
          }),
          {
            $group: {
              _id: null,
              amount: { $sum: source.inwardAmountExpr || source.amountExpr || 0 },
            },
          },
        ]).then((rows) => rows?.[0] || {}),
        aggregateInventoryHistoryInwardSummary({
          source,
          fromDate,
          toDate,
          filters,
          sourceSupplierMatch,
        }),
      ]);

      return Number(summary?.amount || 0) + Number(historySummary?.inwardAmount || 0);
    })
  );

  return round2(rows.reduce((acc, value) => acc + Number(value || 0), 0));
};


const aggregateInventoryMetrics = async ({
  fromDate,
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const totals = await aggregateInventoryTotals({
    fromDate,
    toDate,
    sources,
    filters,
    supplierMatches,
    asOf: true,
  });
  const trendYear = new Date(toDate).getFullYear();
  const trendFromDate = dayStart(new Date(trendYear, 0, 1));
  const selectedMonthKey = monthKeyFromDate(toDate);
  const monthKeys = buildYearMonthKeys(trendYear);
  const inwardMap = new Map();

  const inwardRows = await Promise.all(
    sources.map(async (source) => {
      const sourceSupplierMatch = supplierMatches.get(source.collection);
      const [currentRows, historyRows] = await Promise.all([
        safeAggregate(source.collection, [
          ...buildInventoryInwardBasePipeline({
            source,
            fromDate: trendFromDate,
            toDate,
            contextualMatch,
            sourceSupplierMatch,
          }),
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$effective_inventory_date' },
              },
              inwardValue: { $sum: source.inwardAmountExpr || source.amountExpr || 0 },
            },
          },
        ]),
        aggregateInventoryHistoryInwardTrendRows({
          source,
          fromDate: trendFromDate,
          toDate,
          filters,
          sourceSupplierMatch,
        }),
      ]);

      return [...currentRows, ...historyRows];
    })
  );

  inwardRows.flat().forEach((row) => {
    const key = row?._id;
    if (!key) return;
    inwardMap.set(key, Number(inwardMap.get(key) || 0) + Number(row?.inwardValue || 0));
  });

  const inventorySnapshots = await Promise.all(
    monthKeys.map(async (month) => {
      if (month > selectedMonthKey) {
        return { month, inventoryValue: 0 };
      }

      const monthEnd = month === selectedMonthKey ? toDate : endOfMonthFromKey(month);
      if (!monthEnd) return { month, inventoryValue: 0 };

      const snapshotTotals = await aggregateInventoryTotals({
        fromDate: new Date(0),
        toDate: monthEnd,
        sources,
        filters,
        supplierMatches,
        asOf: true,
      });
      return {
        month,
        inventoryValue: round2(snapshotTotals.amount),
      };
    })
  );

  const inventorySnapshotMap = new Map(
    inventorySnapshots.map((snapshot) => [snapshot.month, Number(snapshot.inventoryValue || 0)])
  );

  return {
    totals,
    trend: monthKeys.map((month) => ({
      month,
      monthLabel: formatMonthLabel(month),
      period: month,
      inwardValue: round2(inwardMap.get(month) || 0),
      inventoryValue: round2(inventorySnapshotMap.get(month) || 0),
    })),
  };
};


const aggregateInventorySubModuleCards = async ({
  fromDate,
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);

  const cards = await Promise.all(
    sources.map(async (source) => {
      const sourceDateField = source.dateField || 'createdAt';
      const sourceSupplierMatch = supplierMatches.get(source.collection);
      const invoiceLookupStages = source.invoiceCollection
        ? [
            {
              $lookup: {
                from: source.invoiceCollection,
                localField: 'invoice_id',
                foreignField: '_id',
                as: 'invoice_details',
              },
            },
            {
              $unwind: {
                path: '$invoice_details',
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : [];

      const effectiveDateExpr = source.invoiceCollection
        ? {
            $ifNull: ['$invoice_details.inward_date', `$${sourceDateField}`],
          }
        : `$${sourceDateField}`;

      const [stockSummary, inwardSummary, historyInwardSummary] = await Promise.all([
        safeAggregate(source.collection, [
          {
            $match: combineMatch(
              source.activeMatch,
              contextualMatch,
              sourceSupplierMatch
            ),
          },
          ...invoiceLookupStages,
          {
            $addFields: {
              effective_inventory_date: effectiveDateExpr,
            },
          },
          {
            $match: dateMatch('effective_inventory_date', fromDate, toDate),
          },
          {
            $group: {
              _id: null,
              stockAmount: { $sum: source.snapshotAmountExpr || source.amountExpr || 0 },
              sqm: { $sum: source.qtyBreakdown?.sqm || 0 },
              sheets: { $sum: source.qtyBreakdown?.sheets || 0 },
              leaves: { $sum: source.qtyBreakdown?.leaves || 0 },
              rolls: { $sum: source.qtyBreakdown?.rolls || 0 },
              cmt: { $sum: source.qtyBreakdown?.cmt || 0 },
              quantity: { $sum: source.qtyBreakdown?.quantity || 0 },
            },
          },
        ]).then((rows) => rows?.[0] || {}),
        safeAggregate(source.collection, [
          ...buildInventoryInwardBasePipeline({
            source,
            fromDate,
            toDate,
            contextualMatch,
            sourceSupplierMatch,
          }),
          {
            $group: {
              _id: null,
              inwardAmount: { $sum: source.inwardAmountExpr || source.amountExpr || 0 },
              sqm: {
                $sum: source.inwardQtyBreakdown?.sqm || source.qtyBreakdown?.sqm || 0,
              },
              sheets: {
                $sum: source.inwardQtyBreakdown?.sheets || source.qtyBreakdown?.sheets || 0,
              },
              leaves: {
                $sum: source.inwardQtyBreakdown?.leaves || source.qtyBreakdown?.leaves || 0,
              },
              rolls: {
                $sum: source.inwardQtyBreakdown?.rolls || source.qtyBreakdown?.rolls || 0,
              },
              cmt: {
                $sum: source.inwardQtyBreakdown?.cmt || source.qtyBreakdown?.cmt || 0,
              },
              quantity: {
                $sum:
                  source.inwardQtyBreakdown?.quantity || source.qtyBreakdown?.quantity || 0,
              },
            },
          },
        ]).then((rows) => rows?.[0] || {}),
        aggregateInventoryHistoryInwardSummary({
          source,
          fromDate,
          toDate,
          filters,
          sourceSupplierMatch,
        }),
      ]);

      const combinedInwardSummary = mergeInwardSummaries(inwardSummary, historyInwardSummary);

      const roundQuantityByKey = (key, value) => {
        const numericValue = Number(value || 0);
        if (['sqm', 'cmt'].includes(String(key || '').toLowerCase())) {
          return Number(numericValue.toFixed(3));
        }
        return round2(numericValue);
      };

      const mapQuantities = (summary = {}) =>
        INVENTORY_QUANTITY_FIELD_LABELS.map(({ key, label }) => {
          const value = roundQuantityByKey(key, summary?.[key] || 0);
          return {
            unit: label,
            value,
          };
        }).filter((row) => Number(row.value || 0) > 0);

      return {
        module: source.module,
        label: INVENTORY_MODULE_LABELS[source.module] || source.module,
        inward: {
          amount: round2(combinedInwardSummary?.inwardAmount || 0),
          quantities: mapQuantities(combinedInwardSummary),
        },
        stockAvailable: {
          amount: round2(stockSummary?.stockAmount || 0),
          quantities: mapQuantities(stockSummary),
        },
      };
    })
  );

  return cards;
};


const aggregateTopSuppliers = async ({
  fromDate,
  toDate,
  inventorySubModule = null,
  filters = {},
}) => {
  const supplierContextMatch = buildContainsStringFieldFilter(filters.supplier, [
    'supplier_details.company_details.supplier_name',
    'supplier_details.supplier_name',
    'supplier_name',
  ]);
  const supplierMap = new Map();
  const filteredSupplierSources = inventorySubModule
    ? SUPPLIER_SOURCES.filter((source) => source.module === inventorySubModule)
    : SUPPLIER_SOURCES;

  const sourceRows = await Promise.all(
    filteredSupplierSources.map(async ({ invoiceCollection, itemCollection }) => {
      return safeAggregate(invoiceCollection, [
        {
          $match: combineMatch(dateMatch('inward_date', fromDate, toDate), supplierContextMatch),
        },
        {
          $lookup: {
            from: itemCollection,
            localField: '_id',
            foreignField: 'invoice_id',
            as: 'items',
          },
        },
        {
          $project: {
            supplier: {
              $ifNull: ['$supplier_details.company_details.supplier_name', 'UNKNOWN'],
            },
            amount: { $ifNull: [{ $sum: '$items.amount' }, 0] },
          },
        },
        { $group: { _id: '$supplier', value: { $sum: '$amount' }, inwards: { $sum: 1 } } },
      ]);
    })
  );

  sourceRows.flat().forEach((row) => {
    const key = row?._id || 'UNKNOWN';
    if (!supplierMap.has(key)) {
      supplierMap.set(key, { label: key, value: 0, inwards: 0 });
    }
    const current = supplierMap.get(key);
    current.value += Number(row?.value || 0);
    current.inwards += Number(row?.inwards || 0);
  });

  return [...supplierMap.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((row) => ({
      label: row.label,
      value: round2(row.value),
      inwards: row.inwards,
    }));
};


const aggregateInventoryAging = async ({
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const bucketMap = new Map(
    INVENTORY_AGING_BUCKETS.map((bucket) => [
      bucket.label,
      { bucket: bucket.label, value: 0, qty: 0, items: 0 },
    ])
  );

  const rows = await Promise.all(
    sources.map((source) => {
      const sourceDateField = source.dateField || 'createdAt';
      const sourceAgeDateField = source.ageDateField || sourceDateField;
      const invoiceLookupStages = source.invoiceCollection
        ? [
            {
              $lookup: {
                from: source.invoiceCollection,
                localField: 'invoice_id',
                foreignField: '_id',
                as: 'invoice_details',
              },
            },
            {
              $unwind: {
                path: '$invoice_details',
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : [];
      const ageDateExpr = source.invoiceCollection
        ? {
            $ifNull: [
              '$invoice_details.inward_date',
              { $ifNull: [`$${sourceAgeDateField}`, `$${sourceDateField}`] },
            ],
          }
        : { $ifNull: [`$${sourceAgeDateField}`, `$${sourceDateField}`] };
      return safeAggregate(source.collection, [
        {
          $match: combineMatch(
            { [sourceDateField]: { $lte: toDate } },
            source.activeMatch,
            contextualMatch,
            supplierMatches.get(source.collection)
          ),
        },
        ...invoiceLookupStages,
        {
          $project: {
            value: source.snapshotAmountExpr || source.amountExpr || 0,
            qty: source.qtyExpr || 0,
            ageDays: {
              $max: [
                {
                  $floor: {
                    $divide: [
                      {
                        $subtract: [
                          toDate,
                          ageDateExpr,
                        ],
                      },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            value: 1,
            qty: 1,
            bucket: {
              $switch: {
                branches: [
                  { case: { $lte: ['$ageDays', 30] }, then: '0-30' },
                  { case: { $lte: ['$ageDays', 60] }, then: '31-60' },
                  { case: { $lte: ['$ageDays', 90] }, then: '61-90' },
                ],
                default: '90+',
              },
            },
          },
        },
        {
          $group: {
            _id: '$bucket',
            value: { $sum: '$value' },
            qty: { $sum: '$qty' },
            items: { $sum: 1 },
          },
        },
      ]);
    })
  );

  rows.flat().forEach((row) => {
    const key = row?._id;
    if (!bucketMap.has(key)) return;
    const current = bucketMap.get(key);
    current.value += Number(row?.value || 0);
    current.qty += Number(row?.qty || 0);
    current.items += Number(row?.items || 0);
  });

  return INVENTORY_AGING_BUCKETS.map((bucket) => {
    const row = bucketMap.get(bucket.label);
    return {
      bucket: bucket.label,
      value: round2(row?.value || 0),
      qty: round2(row?.qty || 0),
      items: Number(row?.items || 0),
    };
  });
};


const aggregateDeadStockValue = async ({
  toDate,
  minAgeDays = 90,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const rows = await Promise.all(
    sources.map(async (source) => {
      const sourceDateField = source.dateField || 'createdAt';
      const sourceAgeDateField = source.ageDateField || sourceDateField;
      const invoiceLookupStages = source.invoiceCollection
        ? [
            {
              $lookup: {
                from: source.invoiceCollection,
                localField: 'invoice_id',
                foreignField: '_id',
                as: 'invoice_details',
              },
            },
            {
              $unwind: {
                path: '$invoice_details',
                preserveNullAndEmptyArrays: true,
              },
            },
          ]
        : [];
      const ageDateExpr = source.invoiceCollection
        ? {
            $ifNull: [
              '$invoice_details.inward_date',
              { $ifNull: [`$${sourceAgeDateField}`, `$${sourceDateField}`] },
            ],
          }
        : { $ifNull: [`$${sourceAgeDateField}`, `$${sourceDateField}`] };
      const [summary] = await safeAggregate(source.collection, [
        {
          $match: combineMatch(
            { [sourceDateField]: { $lte: toDate } },
            source.activeMatch,
            contextualMatch,
            supplierMatches.get(source.collection)
          ),
        },
        ...invoiceLookupStages,
        {
          $project: {
            value: source.snapshotAmountExpr || source.amountExpr || 0,
            ageDays: {
              $max: [
                {
                  $floor: {
                    $divide: [
                      {
                        $subtract: [
                          toDate,
                          ageDateExpr,
                        ],
                      },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $match: {
            ageDays: { $gt: minAgeDays },
          },
        },
        {
          $group: {
            _id: null,
            value: { $sum: '$value' },
          },
        },
      ]);
      return Number(summary?.value || 0);
    })
  );

  return round2(rows.reduce((acc, value) => acc + Number(value || 0), 0));
};


const aggregateTopInventoryItems = async ({
  fromDate,
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const itemMap = new Map();

  const sourceRows = await Promise.all(
    sources.map(async (source) => {
      const sourceDateField = source.dateField || 'createdAt';
      return safeAggregate(source.collection, [
        {
          $match: combineMatch(
            { [sourceDateField]: { $lte: toDate } },
            source.activeMatch,
            contextualMatch,
            supplierMatches.get(source.collection)
          ),
        },
        {
          $project: {
            label: {
              $ifNull: [
                '$item_name',
                {
                  $ifNull: [
                    '$sales_item_name',
                    {
                      $ifNull: [
                        '$product_category',
                        {
                          $ifNull: [
                            '$raw_material',
                            {
                              $ifNull: ['$item_sub_category_name', source.collection],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            value: source.snapshotAmountExpr || source.amountExpr || 0,
          },
        },
        { $match: { value: { $gt: 0 } } },
        { $group: { _id: '$label', value: { $sum: '$value' } } },
      ]);
    })
  );

  sourceRows.flat().forEach((row) => {
    const key = String(row?._id || '').trim().toUpperCase() || 'UNKNOWN';
    if (!itemMap.has(key)) {
      itemMap.set(key, { label: key, value: 0 });
    }
    const current = itemMap.get(key);
    current.value += Number(row?.value || 0);
  });

  return [...itemMap.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((row) => ({
      label: row.label,
      value: round2(row.value),
    }));
};


const aggregateLowStockItems = async ({
  toDate,
  threshold = 10,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const counts = await Promise.all(
    sources.map(async (source) => {
      const sourceDateField = source.dateField || 'createdAt';
      const [summary] = await safeAggregate(source.collection, [
        {
          $match: combineMatch(
            { [sourceDateField]: { $lte: toDate } },
            source.activeMatch,
            contextualMatch,
            supplierMatches.get(source.collection)
          ),
        },
        {
          $project: {
            qty: source.qtyExpr || 0,
          },
        },
        {
          $match: {
            qty: {
              $gt: 0,
              $lte: threshold,
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ]);
      return Number(summary?.count || 0);
    })
  );

  return counts.reduce((acc, count) => acc + Number(count || 0), 0);
};


const aggregateActiveSkus = async ({
  toDate,
  sources = INVENTORY_SOURCES,
  filters = {},
  supplierMatches = new Map(),
}) => {
  const contextualMatch = buildInventoryContextMatch(filters);
  const activeSkuSet = new Set();
  const itemIdentifierExpr = {
    $ifNull: [
      '$item_name',
      {
        $ifNull: [
          '$sales_item_name',
          {
            $ifNull: [
              '$item_name.item_name',
              {
                $ifNull: [
                  '$item_details.item_name',
                  {
                    $ifNull: [
                      '$product_category',
                      { $ifNull: ['$raw_material', { $ifNull: ['$item_sub_category_name', ''] }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const rows = await Promise.all(
    sources.map((source) => {
      const sourceDateField = source.dateField || 'createdAt';
      return safeAggregate(source.collection, [
        {
          $match: combineMatch(
            { [sourceDateField]: { $lte: toDate } },
            source.activeMatch,
            contextualMatch,
            supplierMatches.get(source.collection)
          ),
        },
        {
          $project: {
            qty: source.qtyExpr || 0,
            itemIdentifier: {
              $trim: {
                input: {
                  $toUpper: {
                    $ifNull: [{ $toString: itemIdentifierExpr }, ''],
                  },
                },
              },
            },
          },
        },
        {
          $match: {
            qty: { $gt: 0 },
            itemIdentifier: { $ne: '' },
          },
        },
        {
          $group: {
            _id: '$itemIdentifier',
          },
        },
      ]);
    })
  );

  rows.flat().forEach((row) => {
    const key = String(row?._id || '').trim();
    if (key) activeSkuSet.add(key);
  });

  return activeSkuSet.size;
};


  return {
    aggregateInventoryTotals,
    aggregateInventoryInwardValue,
    aggregateInventoryMetrics,
    aggregateInventorySubModuleCards,
    aggregateTopSuppliers,
    aggregateInventoryAging,
    aggregateDeadStockValue,
    aggregateTopInventoryItems,
    aggregateLowStockItems,
    aggregateActiveSkus,
  };
};
