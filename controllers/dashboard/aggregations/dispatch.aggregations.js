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

const aggregateDispatchSummary = async ({ fromDate, toDate, filters = {} }) => {
  const revenueExpr = {
    $ifNull: ['$final_row_amount', { $ifNull: ['$final_amount', { $ifNull: ['$amount', 0] }] }],
  };
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'dispatch_details.customer_details.company_name',
    'dispatch_details.customer_details.customer_name',
    'dispatch_details.customer_details.owner_name',
    'dispatch_customer.company_name',
    'dispatch_customer.customer_name',
    'dispatch_customer.owner_name',
  ]);

  const [summary] = await safeAggregate('dispatch_items', [
    {
      $lookup: {
        from: 'dispatches',
        localField: 'dispatch_id',
        foreignField: '_id',
        as: 'dispatch_details',
      },
    },
    {
      $unwind: {
        path: '$dispatch_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'dispatch_details.customer_id',
        foreignField: '_id',
        as: 'dispatch_customer',
      },
    },
    {
      $unwind: {
        path: '$dispatch_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('createdAt', fromDate, toDate),
        customerMatch
      ),
    },
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


const aggregateDispatchMetrics = async ({ fromDate, toDate, filters = {} }) => {
  const revenueExpr = {
    $ifNull: ['$final_row_amount', { $ifNull: ['$final_amount', { $ifNull: ['$amount', 0] }] }],
  };
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'dispatch_details.customer_details.company_name',
    'dispatch_details.customer_details.customer_name',
    'dispatch_details.customer_details.owner_name',
    'dispatch_customer.company_name',
    'dispatch_customer.customer_name',
    'dispatch_customer.owner_name',
  ]);
  const summary = await aggregateDispatchSummary({ fromDate, toDate, filters });

  const itemSeriesMix = await safeAggregate('dispatch_items', [
    {
      $lookup: {
        from: 'dispatches',
        localField: 'dispatch_id',
        foreignField: '_id',
        as: 'dispatch_details',
      },
    },
    {
      $unwind: {
        path: '$dispatch_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'dispatch_details.customer_id',
        foreignField: '_id',
        as: 'dispatch_customer',
      },
    },
    {
      $unwind: {
        path: '$dispatch_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('createdAt', fromDate, toDate),
        customerMatch
      ),
    },
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


const aggregateTopCustomers = async ({ fromDate, toDate, filters = {} }) => {
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'customer_details.company_name',
    'customer_details.customer_name',
    'customer_details.owner_name',
    'customer_record.company_name',
    'customer_record.customer_name',
    'customer_record.owner_name',
  ]);

  const rows = await safeAggregate('dispatches', [
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customer_record',
      },
    },
    {
      $unwind: {
        path: '$customer_record',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('invoice_date_time', fromDate, toDate),
        customerMatch
      ),
    },
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


const aggregateDispatchStatus = async ({ fromDate, toDate, filters = {} }) => {
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'customer_details.company_name',
    'customer_details.customer_name',
    'customer_details.owner_name',
    'customer_record.company_name',
    'customer_record.customer_name',
    'customer_record.owner_name',
  ]);

  const rows = await safeAggregate('dispatches', [
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customer_record',
      },
    },
    {
      $unwind: {
        path: '$customer_record',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('invoice_date_time', fromDate, toDate),
        customerMatch
      ),
    },
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


const aggregateDispatchRevenueTrend = async ({ fromDate, toDate, filters = {} }) => {
  const revenueExpr = {
    $ifNull: ['$final_row_amount', { $ifNull: ['$final_amount', { $ifNull: ['$amount', 0] }] }],
  };
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'dispatch_details.customer_details.company_name',
    'dispatch_details.customer_details.customer_name',
    'dispatch_details.customer_details.owner_name',
    'dispatch_customer.company_name',
    'dispatch_customer.customer_name',
    'dispatch_customer.owner_name',
  ]);

  const rows = await safeAggregate('dispatch_items', [
    {
      $lookup: {
        from: 'dispatches',
        localField: 'dispatch_id',
        foreignField: '_id',
        as: 'dispatch_details',
      },
    },
    {
      $unwind: {
        path: '$dispatch_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'dispatch_details.customer_id',
        foreignField: '_id',
        as: 'dispatch_customer',
      },
    },
    {
      $unwind: {
        path: '$dispatch_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('createdAt', fromDate, toDate),
        customerMatch
      ),
    },
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


const aggregatePackedVsDispatchedTrend = async ({ fromDate, toDate, filters = {} }) => {
  const dailyMap = new Map();
  const packedCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'packing_details.customer_details.company_name',
    'packing_details.customer_details.customer_name',
    'packing_details.customer_details.owner_name',
    'packing_customer.company_name',
    'packing_customer.customer_name',
    'packing_customer.owner_name',
  ]);
  const dispatchedCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'dispatch_details.customer_details.company_name',
    'dispatch_details.customer_details.customer_name',
    'dispatch_details.customer_details.owner_name',
    'dispatch_customer.company_name',
    'dispatch_customer.customer_name',
    'dispatch_customer.owner_name',
  ]);

  const packedRows = await safeAggregate('packing_done_items', [
    {
      $lookup: {
        from: 'packing_done_other_details',
        localField: 'packing_done_other_details_id',
        foreignField: '_id',
        as: 'packing_details',
      },
    },
    {
      $unwind: {
        path: '$packing_details',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'packing_details.customer_id',
        foreignField: '_id',
        as: 'packing_customer',
      },
    },
    {
      $unwind: {
        path: '$packing_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('createdAt', fromDate, toDate),
        packedCustomerMatch
      ),
    },
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
    {
      $lookup: {
        from: 'dispatches',
        localField: 'dispatch_id',
        foreignField: '_id',
        as: 'dispatch_details',
      },
    },
    {
      $unwind: {
        path: '$dispatch_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'dispatch_details.customer_id',
        foreignField: '_id',
        as: 'dispatch_customer',
      },
    },
    {
      $unwind: {
        path: '$dispatch_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('createdAt', fromDate, toDate),
        dispatchedCustomerMatch
      ),
    },
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


const aggregateDispatchLifecycleStatus = async ({ fromDate, toDate, filters = {} }) => {
  const dispatchCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'customer_details.company_name',
    'customer_details.customer_name',
    'customer_details.owner_name',
    'customer_record.company_name',
    'customer_record.customer_name',
    'customer_record.owner_name',
  ]);
  const packingCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'customer_details.company_name',
    'customer_details.customer_name',
    'customer_details.owner_name',
    'packing_customer.company_name',
    'packing_customer.customer_name',
    'packing_customer.owner_name',
  ]);
  const dispatchCreatedDateMatch = dateMatch('createdAt', fromDate, toDate);
  const hasDispatchCreatedDateFilter =
    dispatchCreatedDateMatch && Object.keys(dispatchCreatedDateMatch).length > 0;

  const [pendingPacking] = await safeAggregate('packing_done_other_details', [
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'packing_customer',
      },
    },
    {
      $unwind: {
        path: '$packing_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'dispatch_items',
        localField: '_id',
        foreignField: 'packing_done_other_details_id',
        as: 'dispatch_links',
      },
    },
    {
      $lookup: {
        from: 'dispatches',
        let: {
          dispatch_ids: '$dispatch_links.dispatch_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', { $ifNull: ['$$dispatch_ids', []] }],
              },
            },
          },
          ...(hasDispatchCreatedDateFilter ? [{ $match: dispatchCreatedDateMatch }] : []),
          {
            $match: {
              dispatch_status: { $ne: 'CANCELLED' },
            },
          },
        ],
        as: 'dispatches_in_range',
      },
    },
    {
      $match: combineMatch(
        dateMatch('packing_date', fromDate, toDate),
        { 'dispatches_in_range.0': { $exists: false } },
        packingCustomerMatch
      ),
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]);

  const [dispatchSummary] = await safeAggregate('dispatches', [
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customer_record',
      },
    },
    {
      $unwind: {
        path: '$customer_record',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        // Dispatch graph should classify dispatched records using dispatch created date.
        dateMatch('createdAt', fromDate, toDate),
        dispatchCustomerMatch
      ),
    },
    {
      $group: {
        _id: null,
        dispatchedCount: {
          $sum: {
            $cond: [{ $eq: ['$dispatch_status', 'CANCELLED'] }, 0, 1],
          },
        },
        dispatchedValue: {
          $sum: {
            $cond: [
              { $eq: ['$dispatch_status', 'CANCELLED'] },
              0,
              { $ifNull: ['$final_total_amount', 0] },
            ],
          },
        },
      },
    },
  ]);

  const pendingCount = Number(pendingPacking?.count || 0);
  const dispatchedCount = Number(dispatchSummary?.dispatchedCount || 0);

  const template = [
    {
      status: 'PENDING',
      count: pendingCount,
      value: 0,
    },
    {
      status: 'DISPATCHED',
      count: dispatchedCount,
      value: round2(dispatchSummary?.dispatchedValue || 0),
    },
  ];

  return template;
};


const aggregateDispatchDocumentSummary = async ({ fromDate, toDate, filters = {} }) => {
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'customer_details.company_name',
    'customer_details.customer_name',
    'customer_details.owner_name',
    'customer_record.company_name',
    'customer_record.customer_name',
    'customer_record.owner_name',
  ]);

  const [summary] = await safeAggregate('dispatches', [
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customer_record',
      },
    },
    {
      $unwind: {
        path: '$customer_record',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('invoice_date_time', fromDate, toDate),
        customerMatch
      ),
    },
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
