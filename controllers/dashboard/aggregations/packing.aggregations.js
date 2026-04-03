export const createPackingAggregations = (context) => {
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

const aggregatePackingMetrics = async ({ fromDate, toDate }) => {
  const [packed] = await safeAggregate('packing_done_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: null,
        qtySheets: { $sum: { $ifNull: ['$no_of_sheets', 0] } },
        qtySqm: { $sum: { $ifNull: ['$sqm', 0] } },
        amount: { $sum: { $ifNull: ['$amount', 0] } },
      },
    },
  ]);

  const [pendingPacking] = await safeAggregate('finished_ready_for_packing_details', [
    {
      $match: {
        ...dateMatch('createdAt', fromDate, toDate),
        is_packing_done: false,
      },
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  const [notDispatched] = await safeAggregate('packing_done_other_details', [
    {
      $match: {
        ...dateMatch('packing_date', fromDate, toDate),
        is_dispatch_done: false,
      },
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  return {
    qtySheets: round2(packed?.qtySheets || 0),
    qtySqm: round2(packed?.qtySqm || 0),
    amount: round2(packed?.amount || 0),
    pending: Number(pendingPacking?.count || 0),
    packedNotDispatched: Number(notDispatched?.count || 0),
  };
};


const aggregatePackingGoodsTypeMetrics = async ({ fromDate, toDate }) => {
  const rows = await safeAggregate('packing_done_items', [
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
      $match: dateMatch('packing_details.packing_date', fromDate, toDate),
    },
    {
      $addFields: {
        normalizedOrderCategories: {
          $map: {
            input: { $ifNull: ['$packing_details.order_category', []] },
            as: 'category',
            in: { $toUpper: '$$category' },
          },
        },
      },
    },
    {
      $addFields: {
        goodsType: {
          $cond: [
            { $in: ['RAW', '$normalizedOrderCategories'] },
            'RAW GOODS',
            'FINISHED GOODS',
          ],
        },
        customerName: {
          $ifNull: [
            '$packing_details.customer_details.company_name',
            {
              $ifNull: [
                '$packing_details.customer_details.customer_name',
                {
                  $ifNull: ['$packing_details.customer_details.owner_name', 'UNKNOWN'],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        goodsType: 1,
        packingId: '$packing_details.packing_id',
        packingDate: '$packing_details.packing_date',
        customerName: 1,
        orderCategory: '$packing_details.order_category',
        noOfSheets: { $ifNull: ['$no_of_sheets', 0] },
        sqm: { $ifNull: ['$sqm', 0] },
        quantity: { $ifNull: ['$quantity', 0] },
        amount: { $ifNull: ['$amount', 0] },
      },
    },
  ]);

  const summaryByType = {
    'FINISHED GOODS': {
      goodsType: 'FINISHED GOODS',
      packings: 0,
      noOfSheets: 0,
      sqm: 0,
      quantity: 0,
      amount: 0,
    },
    'RAW GOODS': {
      goodsType: 'RAW GOODS',
      packings: 0,
      noOfSheets: 0,
      sqm: 0,
      quantity: 0,
      amount: 0,
    },
  };

  const recordsByType = {
    'FINISHED GOODS': [],
    'RAW GOODS': [],
  };

  const packingIdsByType = {
    'FINISHED GOODS': new Set(),
    'RAW GOODS': new Set(),
  };

  rows.forEach((row) => {
    const goodsType = String(row?.goodsType || 'FINISHED GOODS').toUpperCase();
    const normalizedGoodsType = goodsType === 'RAW GOODS' ? 'RAW GOODS' : 'FINISHED GOODS';

    const record = {
      packingId: row?.packingId || '-',
      packingDate: row?.packingDate || null,
      customerName: row?.customerName || 'UNKNOWN',
      orderCategory: row?.orderCategory || [],
      noOfSheets: round2(row?.noOfSheets || 0),
      sqm: round2(row?.sqm || 0),
      quantity: round2(row?.quantity || 0),
      amount: round2(row?.amount || 0),
    };

    recordsByType[normalizedGoodsType].push(record);

    summaryByType[normalizedGoodsType].noOfSheets += Number(row?.noOfSheets || 0);
    summaryByType[normalizedGoodsType].sqm += Number(row?.sqm || 0);
    summaryByType[normalizedGoodsType].quantity += Number(row?.quantity || 0);
    summaryByType[normalizedGoodsType].amount += Number(row?.amount || 0);

    if (row?.packingId !== null && row?.packingId !== undefined) {
      packingIdsByType[normalizedGoodsType].add(String(row.packingId));
    }
  });

  Object.keys(summaryByType).forEach((key) => {
    summaryByType[key].packings = packingIdsByType[key].size;
    summaryByType[key].noOfSheets = round2(summaryByType[key].noOfSheets);
    summaryByType[key].sqm = round2(summaryByType[key].sqm);
    summaryByType[key].quantity = round2(summaryByType[key].quantity);
    summaryByType[key].amount = round2(summaryByType[key].amount);
  });

  Object.keys(recordsByType).forEach((key) => {
    recordsByType[key] = recordsByType[key]
      .sort((left, right) => {
        const leftDate = asDate(left?.packingDate)?.getTime() || 0;
        const rightDate = asDate(right?.packingDate)?.getTime() || 0;
        return rightDate - leftDate;
      })
      .slice(0, 300);
  });

  return {
    summaryByType,
    recordsByType,
  };
};


  return {
    aggregatePackingMetrics,
    aggregatePackingGoodsTypeMetrics,
  };
};
