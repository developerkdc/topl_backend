export const createOrdersAggregations = (context) => {
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

const aggregateOrderFlowTables = async ({ fromDate, toDate, filters = {} }) => {
  const customerMatch = buildContainsStringFieldFilter(filters.customer, [
    'order_details.owner_name',
    'customer_name',
    'customer_details.company_name',
  ]);
  const seriesMatch = buildContainsStringFieldFilter(filters.series, [
    'series_name',
    'series_product_code',
    'order_details.series_product',
  ]);

  const byType = { RAW: [], DECORATIVE: [], SERIES: [] };

  const rowsByCollection = await Promise.all(
    ORDER_TABLE_SOURCES.map(async (source) => {
      const rows = await safeAggregate(source.collection, [
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
          $addFields: {
            order_date_effective: {
              $ifNull: ['$order_details.orderDate', '$createdAt'],
            },
          },
        },
        {
          $match: combineMatch(
            dateMatch('order_date_effective', fromDate, toDate),
            customerMatch,
            seriesMatch
          ),
        },
        {
          $project: {
            productCategory: {
              $ifNull: ['$product_category', source.defaultCategory],
            },
            orderNo: '$order_details.order_no',
            orderDate: '$order_date_effective',
            customerName: {
              $ifNull: [
                '$order_details.owner_name',
                { $ifNull: ['$customer_name', 'UNKNOWN'] },
              ],
            },
            itemName: {
              $ifNull: [
                '$item_name',
                {
                  $ifNull: [
                    '$item_name_name',
                    {
                      $ifNull: [
                        '$item',
                        { $ifNull: ['$item_details.item_name', '$itemName'] },
                      ],
                    },
                  ],
                },
              ],
            },
            photoNo: {
              $ifNull: [
                '$photo_no',
                {
                  $ifNull: [
                    '$photo_number',
                    { $ifNull: ['$photoNumber', '$order_details.photo_number'] },
                  ],
                },
              ],
            },
            sheetsOrdered: source.qtyExpr,
            qtySheets: source.qtyExpr,
            qtyRolls: {
              $ifNull: [
                '$no_of_roll',
                { $ifNull: ['$number_of_roll', { $ifNull: ['$rolls', 0] }] },
              ],
            },
            qtyCmt: {
              $ifNull: ['$cmt', { $ifNull: ['$physical_cmt', 0] }],
            },
            qtySqm: { $ifNull: ['$sqm', 0] },
            dispatchedSheets: { $ifNull: ['$dispatch_no_of_sheets', 0] },
            damageSheets: {
              $ifNull: ['$damage_no_of_sheets', { $ifNull: ['$damage', 0] }],
            },
            priorityRaw: {
              $ifNull: [
                '$priority',
                {
                  $ifNull: ['$order_details.priority', '$priority_level'],
                },
              ],
            },
            pressingDate: {
              $ifNull: [
                '$pressing_schedule_date',
                { $ifNull: ['$pressing_date', '$pressing_plan_date'] },
              ],
            },
            cncDate: {
              $ifNull: ['$cnc_schedule_date', '$cnc_date'],
            },
            colourDate: {
              $ifNull: [
                '$colour_schedule_date',
                { $ifNull: ['$color_schedule_date', '$colour_date'] },
              ],
            },
            statusRaw: {
              $ifNull: ['$item_status', '$order_details.order_status'],
            },
            createdAt: 1,
          },
        },
        {
          $sort: { orderDate: -1, createdAt: -1 },
        },
        {
          $limit: 1000,
        },
      ]);

      return { key: source.key, rows };
    })
  );

  rowsByCollection.forEach(({ key, rows }) => {
    byType[key] = (rows || []).map((row) => {
      const sheetsOrdered = round2(row?.sheetsOrdered || 0);
      const dispatched = round2(row?.dispatchedSheets || 0);
      const damage = round2(row?.damageSheets || 0);
      const balance = round2(Math.max(sheetsOrdered - dispatched - damage, 0));
      const priority = normalizeOrderPriorityLabel(row?.priorityRaw);
      const rawStatus = String(row?.statusRaw || '').trim();
      const status = rawStatus
        ? rawStatus
            .toLowerCase()
            .split(/[\s_]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        : balance > 0
          ? 'Pending'
          : 'Completed';

      return {
        productCategory: row?.productCategory || ORDER_TABLE_SOURCES.find((source) => source.key === key)?.label || key,
        orderNo: row?.orderNo || '-',
        orderDate: row?.orderDate || null,
        customerName: row?.customerName || 'UNKNOWN',
        itemName: row?.itemName || '-',
        photoNo: row?.photoNo || '-',
        sheetsOrdered,
        qtySheets: round2(row?.qtySheets || 0),
        qtyRolls: round2(row?.qtyRolls || 0),
        qtyCmt: round2(row?.qtyCmt || 0),
        qtySqm: round2(row?.qtySqm || 0),
        dispatched,
        damage,
        balance,
        priority,
        pressing: row?.pressingDate || null,
        cnc: row?.cncDate || null,
        colour: row?.colourDate || null,
        status,
      };
    });
  });

  const todayStart = dayStart(new Date());
  const scheduleTable = [...Object.values(byType).flat()]
    .sort((left, right) => {
      const leftDate = asDate(left?.orderDate)?.getTime() || 0;
      const rightDate = asDate(right?.orderDate)?.getTime() || 0;
      return rightDate - leftDate;
    })
    .slice(0, 500)
    .map((row) => {
      const pressingDate = asDate(row?.pressing);
      const computedStatus =
        Number(row?.balance || 0) <= 0
          ? 'Completed'
          : pressingDate && pressingDate < todayStart
            ? 'Overdue'
            : pressingDate
              ? 'Scheduled'
              : 'Pending';

      return {
        orderNo: row?.orderNo || '-',
        customerName: row?.customerName || '-',
        priority: row?.priority || 'Third',
        pressingScheduleDate: row?.pressing || null,
        cncScheduleDate: row?.cnc || null,
        colourScheduleDate: row?.colour || null,
        balanceSheets: round2(row?.balance || 0),
        status: computedStatus,
      };
    });

  return {
    orderFlowByType: byType,
    scheduleTable,
  };
};


const aggregateOrderMetrics = async ({ fromDate, toDate }) => {
  const qtyExpr = {
    $ifNull: ['$no_of_sheets', { $ifNull: ['$no_of_sheet', 0] }],
  };
  const dispatchQtyExpr = { $ifNull: ['$dispatch_no_of_sheets', 0] };
  const openQtyExpr = { $max: [{ $subtract: [qtyExpr, dispatchQtyExpr] }, 0] };
  const amountExpr = { $ifNull: ['$amount', 0] };
  const openAmountExpr = {
    $cond: [{ $gt: [openQtyExpr, 0] }, amountExpr, 0],
  };

  const totals = {
    orderedQty: 0,
    orderedSqm: 0,
    orderedAmount: 0,
    openQty: 0,
    openAmount: 0,
  };
  const monthlyMap = new Map();
  const openOrderIds = new Set();

  const rows = await Promise.all(
    ORDER_ITEM_COLLECTIONS.map(async (collection) => {
      const [summary] = await safeAggregate(collection, [
        { $match: dateMatch('createdAt', fromDate, toDate) },
        {
          $group: {
            _id: null,
            orderedQty: { $sum: qtyExpr },
            orderedSqm: { $sum: { $ifNull: ['$sqm', 0] } },
            orderedAmount: { $sum: amountExpr },
            openQty: { $sum: openQtyExpr },
            openAmount: { $sum: openAmountExpr },
          },
        },
      ]);

      const monthlyRows = await safeAggregate(collection, [
        { $match: dateMatch('createdAt', fromDate, toDate) },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            amount: { $sum: amountExpr },
            qty: { $sum: qtyExpr },
          },
        },
      ]);

      const openOrderRows = await safeAggregate(collection, [
        { $match: dateMatch('createdAt', fromDate, toDate) },
        {
          $project: {
            order_id: 1,
            openQty: openQtyExpr,
          },
        },
        {
          $match: {
            order_id: { $ne: null },
            openQty: { $gt: 0 },
          },
        },
        { $group: { _id: '$order_id' } },
      ]);

      return { summary, monthlyRows, openOrderRows };
    })
  );

  rows.forEach((row) => {
    totals.orderedQty += Number(row.summary?.orderedQty || 0);
    totals.orderedSqm += Number(row.summary?.orderedSqm || 0);
    totals.orderedAmount += Number(row.summary?.orderedAmount || 0);
    totals.openQty += Number(row.summary?.openQty || 0);
    totals.openAmount += Number(row.summary?.openAmount || 0);
    mergeMonthlyRows(monthlyMap, row.monthlyRows);
    row.openOrderRows.forEach((openOrder) => {
      if (openOrder?._id) openOrderIds.add(String(openOrder._id));
    });
  });

  const [headerSummary] = await safeAggregate('orders', [
    { $match: dateMatch('orderDate', fromDate, toDate) },
    { $group: { _id: null, ordersBooked: { $sum: 1 } } },
  ]);

  const headerMonthly = await safeAggregate('orders', [
    { $match: dateMatch('orderDate', fromDate, toDate) },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
        count: { $sum: 1 },
      },
    },
  ]);
  mergeMonthlyRows(monthlyMap, headerMonthly, 'amount', 'qty');

  return {
    ordersBooked: Number(headerSummary?.ordersBooked || 0),
    openOrdersCount: openOrderIds.size,
    totals: {
      orderedQty: round2(totals.orderedQty),
      orderedSqm: round2(totals.orderedSqm),
      orderedAmount: round2(totals.orderedAmount),
      openQty: round2(totals.openQty),
      openAmount: round2(totals.openAmount),
    },
    trend: sortedMonthly(monthlyMap).map((row) => ({
      period: row.period,
      amount: row.amount,
      qty: row.qty,
      orders: row.count,
    })),
  };
};


const aggregateAllocationMetrics = async ({ fromDate, toDate }) => {
  const qtyExpr = {
    $ifNull: [
      '$item_details.no_of_sheets',
      {
        $ifNull: [
          '$item_details.no_of_sheet',
          {
            $ifNull: [
              '$item_details.no_of_leaves',
              { $ifNull: ['$item_details.quantity', 0] },
            ],
          },
        ],
      },
    ],
  };

  const [summary] = await safeAggregate('issued_for_order_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: null,
        allocatedQty: { $sum: qtyExpr },
        allocatedSqm: { $sum: { $ifNull: ['$item_details.sqm', 0] } },
        allocatedAmount: { $sum: { $ifNull: ['$item_details.amount', 0] } },
      },
    },
  ]);

  return {
    allocatedQty: round2(summary?.allocatedQty || 0),
    allocatedSqm: round2(summary?.allocatedSqm || 0),
    allocatedAmount: round2(summary?.allocatedAmount || 0),
  };
};


const aggregateOrderDispatchCycle = async ({ fromDate, toDate }) => {
  const [summary] = await safeAggregate('dispatch_items', [
    { $match: dateMatch('createdAt', fromDate, toDate) },
    {
      $group: {
        _id: {
          dispatch_id: '$dispatch_id',
          order_id: '$order_id',
        },
      },
    },
    {
      $lookup: {
        from: 'dispatches',
        localField: '_id.dispatch_id',
        foreignField: '_id',
        as: 'dispatch_details',
      },
    },
    {
      $lookup: {
        from: 'orders',
        localField: '_id.order_id',
        foreignField: '_id',
        as: 'order_details',
      },
    },
    { $unwind: { path: '$dispatch_details', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$order_details', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        invoiceDate: '$dispatch_details.invoice_date_time',
        orderDate: '$order_details.orderDate',
      },
    },
    {
      $match: {
        invoiceDate: { $ne: null },
        orderDate: { $ne: null },
      },
    },
    {
      $project: {
        cycleDays: {
          $divide: [{ $subtract: ['$invoiceDate', '$orderDate'] }, 1000 * 60 * 60 * 24],
        },
      },
    },
    { $match: { cycleDays: { $gte: 0 } } },
    {
      $group: {
        _id: null,
        avgDays: { $avg: '$cycleDays' },
        samples: { $sum: 1 },
      },
    },
  ]);

  return {
    avgDays: round2(summary?.avgDays || 0),
    samples: Number(summary?.samples || 0),
  };
};


const aggregateOrdersByCategory = async ({ fromDate, toDate }) => {
  const categoryMap = new Map();

  const itemRows = await Promise.all(
    ORDER_CATEGORY_SOURCES.map(async (source) => {
      const [summary] = await safeAggregate(source.collection, [
        { $match: dateMatch('createdAt', fromDate, toDate) },
        {
          $group: {
            _id: null,
            qty: { $sum: source.qtyExpr || 0 },
            amount: { $sum: source.amountExpr || 0 },
            items: { $sum: 1 },
          },
        },
      ]);
      return {
        category: source.category,
        qty: Number(summary?.qty || 0),
        amount: Number(summary?.amount || 0),
      };
    })
  );

  itemRows.forEach((row) => {
    categoryMap.set(row.category, {
      category: row.category,
      amount: round2(row.amount),
      qty: round2(row.qty),
      orders: 0,
    });
  });

  const orderRows = await safeAggregate('orders', [
    { $match: dateMatch('orderDate', fromDate, toDate) },
    {
      $group: {
        _id: {
          $toUpper: { $ifNull: ['$order_category', 'UNKNOWN'] },
        },
        orders: { $sum: 1 },
      },
    },
  ]);

  orderRows.forEach((row) => {
    const key = row?._id === 'SERIES_PRODUCT' ? 'SERIES PRODUCT' : row?._id;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        category: key,
        amount: 0,
        qty: 0,
        orders: 0,
      });
    }
    const current = categoryMap.get(key);
    current.orders += Number(row?.orders || 0);
  });

  return [...categoryMap.values()].sort((a, b) => b.amount - a.amount);
};


const aggregateApprovedOrderSummary = async ({ fromDate, toDate }) => {
  const [summary] = await safeAggregate('orders', [
    { $match: dateMatch('orderDate', fromDate, toDate) },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: {
          $sum: {
            $cond: [{ $eq: ['$approval_status.approved.status', true] }, 1, 0],
          },
        },
      },
    },
  ]);

  return {
    total: Number(summary?.total || 0),
    approved: Number(summary?.approved || 0),
  };
};


  return {
    aggregateOrderFlowTables,
    aggregateOrderMetrics,
    aggregateAllocationMetrics,
    aggregateOrderDispatchCycle,
    aggregateOrdersByCategory,
    aggregateApprovedOrderSummary,
  };
};
