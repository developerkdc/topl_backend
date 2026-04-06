export const createDispatchAggregations = (context) => {
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

const aggregateDispatchSummary = async ({ fromDate, toDate }) => {
  const revenueExpr = {
    $ifNull: ['$final_row_amount', { $ifNull: ['$final_amount', { $ifNull: ['$amount', 0] }] }],
  };

  const [summary] = await safeAggregate('dispatch_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: null,
        revenue: { $sum: revenueExpr },
        qtySheets: { $sum: { $ifNull: ['$no_of_sheets', 0] } },
        qtySqm: { $sum: { $ifNull: ['$sqm', 0] } },
        qtyCmt: { $sum: { $ifNull: ['$cmt', 0] } },
      },
    },
  ]);

  return {
    revenue: round2(summary?.revenue || 0),
    qtySheets: round2(summary?.qtySheets || 0),
    qtySqm: round2(summary?.qtySqm || 0),
    qtyCmt: round2(summary?.qtyCmt || 0),
  };
};


const aggregateDispatchMetrics = async ({ fromDate, toDate }) => {
  const revenueExpr = {
    $ifNull: ['$final_row_amount', { $ifNull: ['$final_amount', { $ifNull: ['$amount', 0] }] }],
  };
  const summary = await aggregateDispatchSummary({ fromDate, toDate });

  const itemSeriesMix = await safeAggregate('dispatch_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $project: {
        value: revenueExpr,
        label: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ['$sales_item_name', ''] } }, 0] },
            '$sales_item_name',
            {
              $cond: [
                { $gt: [{ $strLenCP: { $ifNull: ['$item_name', ''] } }, 0] },
                '$item_name',
                'UNKNOWN',
              ],
            },
          ],
        },
      },
    },
    { $group: { _id: '$label', value: { $sum: '$value' } } },
    { $sort: { value: -1 } },
    { $limit: 10 },
  ]);

  return {
    ...summary,
    itemSeriesMix: itemSeriesMix.map((row) => ({
      name: row?._id || 'UNKNOWN',
      value: round2(row?.value || 0),
    })),
  };
};


const aggregateTopCustomers = async ({ fromDate, toDate }) => {
  const rows = await safeAggregate('dispatches', [
    { $match: dateMatch('invoice_date_time', fromDate, toDate) },
    {
      $group: {
        _id: {
          $ifNull: [
            '$customer_details.company_name',
            {
              $ifNull: [
                '$customer_details.customer_name',
                { $ifNull: ['$customer_details.owner_name', 'UNKNOWN'] },
              ],
            },
          ],
        },
        value: { $sum: { $ifNull: ['$final_total_amount', 0] } },
        invoices: { $sum: 1 },
      },
    },
    { $sort: { value: -1 } },
    { $limit: 10 },
  ]);

  return rows.map((row) => ({
    label: row?._id || 'UNKNOWN',
    value: round2(row?.value || 0),
    invoices: Number(row?.invoices || 0),
  }));
};


const aggregateDispatchStatus = async ({ fromDate, toDate }) => {
  const rows = await safeAggregate('dispatches', [
    { $match: dateMatch('invoice_date_time', fromDate, toDate) },
    {
      $group: {
        _id: { $ifNull: ['$dispatch_status', 'PENDING'] },
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ['$final_total_amount', 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return rows.map((row) => ({
    status: row?._id || 'PENDING',
    count: Number(row?.count || 0),
    value: round2(row?.value || 0),
  }));
};


const aggregateDispatchRevenueTrend = async ({ fromDate, toDate }) => {
  const revenueExpr = {
    $ifNull: ['$final_row_amount', { $ifNull: ['$final_amount', { $ifNull: ['$amount', 0] }] }],
  };

  const rows = await safeAggregate('dispatch_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
        revenue: { $sum: revenueExpr },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    period: row?._id,
    revenue: round2(row?.revenue || 0),
  }));
};


const aggregatePackedVsDispatchedTrend = async ({ fromDate, toDate }) => {
  const dailyMap = new Map();

  const packedRows = await safeAggregate('packing_done_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
        packed: {
          $sum: { $ifNull: ['$no_of_sheets', 0] },
        },
      },
    },
  ]);

  packedRows.forEach((row) => {
    const key = row?._id;
    if (!key) return;
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { period: key, packed: 0, dispatched: 0 });
    }
    const current = dailyMap.get(key);
    current.packed += Number(row?.packed || 0);
  });

  const dispatchedRows = await safeAggregate('dispatch_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
        dispatched: {
          $sum: { $ifNull: ['$no_of_sheets', 0] },
        },
      },
    },
  ]);

  dispatchedRows.forEach((row) => {
    const key = row?._id;
    if (!key) return;
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { period: key, packed: 0, dispatched: 0 });
    }
    const current = dailyMap.get(key);
    current.dispatched += Number(row?.dispatched || 0);
  });

  return [...dailyMap.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => ({
      period: row.period,
      packed: round2(row.packed),
      dispatched: round2(row.dispatched),
    }));
};


const aggregateDispatchLifecycleStatus = async ({ fromDate, toDate }) => {
  const rows = await safeAggregate('dispatches', [
    { $match: dateMatch('invoice_date_time', fromDate, toDate) },
    {
      $project: {
        status: {
          $switch: {
            branches: [
              {
                case: {
                  $or: [
                    { $eq: ['$dispatch_status', 'CANCELLED'] },
                    { $eq: ['$irn_status', 'PENDING'] },
                    { $eq: ['$eway_bill_status', 'PENDING'] },
                    { $eq: ['$eway_bill_status', 'CANCELLED'] },
                  ],
                },
                then: 'PENDING',
              },
              {
                case: {
                  $or: [
                    { $eq: ['$irn_status', 'CREATED'] },
                    { $eq: ['$eway_bill_status', 'CREATED'] },
                  ],
                },
                then: 'IN TRANSIT',
              },
              {
                case: {
                  $eq: ['$eway_bill_status', 'EXPIRED'],
                },
                then: 'DELIVERED',
              },
            ],
            default: 'DELIVERED',
          },
        },
        value: { $ifNull: ['$final_total_amount', 0] },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        value: { $sum: '$value' },
      },
    },
  ]);

  const template = ['PENDING', 'IN TRANSIT', 'DELIVERED'].map((status) => ({
    status,
    count: 0,
    value: 0,
  }));

  rows.forEach((row) => {
    const index = template.findIndex((item) => item.status === row?._id);
    if (index === -1) return;
    template[index].count = Number(row?.count || 0);
    template[index].value = round2(row?.value || 0);
  });

  return template;
};


const aggregateDispatchDocumentSummary = async ({ fromDate, toDate }) => {
  const [summary] = await safeAggregate('dispatches', [
    { $match: dateMatch('invoice_date_time', fromDate, toDate) },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ['$final_total_amount', 0] } },
      },
    },
  ]);

  return {
    count: Number(summary?.count || 0),
    value: round2(summary?.value || 0),
  };
};


  return {
    aggregateDispatchSummary,
    aggregateDispatchMetrics,
    aggregateTopCustomers,
    aggregateDispatchStatus,
    aggregateDispatchRevenueTrend,
    aggregatePackedVsDispatchedTrend,
    aggregateDispatchLifecycleStatus,
    aggregateDispatchDocumentSummary,
  };
};
