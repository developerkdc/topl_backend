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

const aggregatePackingMetrics = async ({ fromDate, toDate, filters = {} }) => {
  const packedCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'packing_details.customer_details.company_name',
    'packing_details.customer_details.customer_name',
    'packing_details.customer_details.owner_name',
    'packing_customer.company_name',
    'packing_customer.customer_name',
    'packing_customer.owner_name',
    'order_details.owner_name',
  ]);

  const [packed] = await safeAggregate('packing_done_items', [
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
        from: 'orders',
        localField: 'order_id',
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: true,
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
        dateMatch('packing_details.packing_date', fromDate, toDate),
        packedCustomerMatch
      ),
    },
    {
      $group: {
        _id: null,
        qtySheets: { $sum: { $ifNull: ['$no_of_sheets', 0] } },
        qtySqm: { $sum: { $ifNull: ['$sqm', 0] } },
        amount: { $sum: { $ifNull: ['$amount', 0] } },
      },
    },
  ]);

  const pendingCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'order_details.owner_name',
    'order_customer.company_name',
    'order_customer.customer_name',
    'order_customer.owner_name',
  ]);

  const [pendingPacking] = await safeAggregate('finished_ready_for_packing_details', [
    {
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'order_details.customer_id',
        foreignField: '_id',
        as: 'order_customer',
      },
    },
    {
      $unwind: {
        path: '$order_customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combineMatch(
        dateMatch('createdAt', fromDate, toDate),
        { is_packing_done: false },
        pendingCustomerMatch
      ),
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  const notDispatchedCustomerMatch = buildContainsStringFieldFilter(filters.customer, [
    'customer_details.company_name',
    'customer_details.customer_name',
    'customer_details.owner_name',
    'packing_customer.company_name',
    'packing_customer.customer_name',
    'packing_customer.owner_name',
  ]);

  const [notDispatched] = await safeAggregate('packing_done_other_details', [
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
      $match: combineMatch(
        dateMatch('packing_date', fromDate, toDate),
        { is_dispatch_done: false },
        notDispatchedCustomerMatch
      ),
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


const aggregatePackingGoodsTypeMetrics = async ({ fromDate, toDate, filters = {} }) => {
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'packing_details.customer_details.company_name',
    'packing_details.customer_details.customer_name',
    'packing_details.customer_details.owner_name',
    'packing_customer.company_name',
    'packing_customer.customer_name',
    'packing_customer.owner_name',
    'order_details.owner_name',
  ]);

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
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        foreignField: '_id',
        as: 'order_details',
      },
    },
    {
      $unwind: {
        path: '$order_details',
        preserveNullAndEmptyArrays: true,
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
        dateMatch('packing_details.packing_date', fromDate, toDate),
        customerMatch
      ),
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
                  $ifNull: [
                    '$packing_details.customer_details.owner_name',
                    {
                      $ifNull: [
                        '$packing_customer.company_name',
                        {
                          $ifNull: [
                            '$packing_customer.customer_name',
                            {
                              $ifNull: [
                                '$packing_customer.owner_name',
                                {
                                  $ifNull: ['$order_details.owner_name', '-'],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
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
        isDispatchDone: { $ifNull: ['$packing_details.is_dispatch_done', false] },
        customerName: 1,
        orderCategory: '$packing_details.order_category',
        noOfSheets: { $ifNull: ['$no_of_sheets', 0] },
        noOfLeaves: { $ifNull: ['$no_of_leaves', 0] },
        numberOfRolls: {
          $ifNull: ['$number_of_rolls', { $ifNull: ['$number_of_roll', 0] }],
        },
        sqm: { $ifNull: ['$sqm', 0] },
        quantity: { $ifNull: ['$quantity', 0] },
        cmt: { $ifNull: ['$cmt', 0] },
        cbm: { $ifNull: ['$cbm', { $ifNull: ['$cmt', 0] }] },
        productType: {
          $ifNull: ['$product_type', '-'],
        },
        itemName: {
          $ifNull: ['$item_name', '-'],
        },
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
    const productType = String(row?.productType || '')
      .trim()
      .toUpperCase();
    const sheetsValue = round2(row?.noOfSheets || 0);
    const leavesValue = round2(row?.noOfLeaves || 0);
    const rollsValue = round2(row?.numberOfRolls || 0);
    const quantityValue = round2(row?.quantity || 0);
    const sqmValue = round2(row?.sqm || 0);
    const cbmValue = round2(row?.cbm || 0);
    const cmtValue = round2(row?.cmt || 0);
    const displaySheetLikeQty = sheetsValue > 0
      ? sheetsValue
      : leavesValue > 0
        ? leavesValue
        : 0;

    const dispatchDoneRaw = row?.isDispatchDone;
    const normalizedDispatchDone =
      dispatchDoneRaw === true ||
      dispatchDoneRaw === 1 ||
      String(dispatchDoneRaw || '')
        .trim()
        .toLowerCase() === 'true' ||
      String(dispatchDoneRaw || '').trim() === '1';

    const record = {
      packingId: row?.packingId || '-',
      packingDate: row?.packingDate || null,
      customerName: row?.customerName || '-',
      orderCategory: row?.orderCategory || [],
      productType: row?.productType || '-',
      itemName: row?.itemName || '-',
      noOfSheets: displaySheetLikeQty,
      noOfLeaves: leavesValue,
      numberOfRolls: rollsValue,
      sqm: sqmValue,
      quantity: quantityValue,
      cmt: cmtValue,
      cbm: cbmValue,
      amount: round2(row?.amount || 0),
      isDispatchDone: normalizedDispatchDone,
      dispatchStatus: normalizedDispatchDone ? 'DISPATCHED' : 'PENDING',
    };

    const preferredUnit =
      sheetsValue > 0
        ? 'SHEETS'
        : leavesValue > 0
          ? 'LEAVES'
          : rollsValue > 0
            ? 'ROLLS'
            : quantityValue > 0
            ? 'QUANTITY'
            : cbmValue > 0 || cmtValue > 0
              ? 'CBM'
              : ['LOG', 'FLITCH', 'CROSSCUTTING', 'FLITCHING'].includes(productType)
                ? 'CBM'
                : ['VENEER', 'DRESSING', 'DRESSING_FACTORY'].includes(productType)
                  ? 'LEAVES'
                  : ['FLEECE_PAPER', 'FLEECE PAPER'].includes(productType)
                    ? 'ROLLS'
                    : ['STORE', 'OTHER_GOODS', 'OTHER GOODS'].includes(productType)
                      ? 'QUANTITY'
                      : sqmValue > 0
                        ? 'SQM'
                        : 'SHEETS';

    record.unit = preferredUnit;

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
