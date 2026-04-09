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
  const normalizeId = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }
    const asText = String(value).trim();
    return asText && asText !== '[object Object]' ? asText : null;
  };
  const toObjectIds = (idSet) =>
    [...idSet]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
  const buildStageProcessLookup = async (
    collectionName,
    qtyExpr,
    orderItemObjectIds,
    orderObjectIds
  ) => {
    const referenceFilters = [];
    if (orderItemObjectIds.length) {
      referenceFilters.push({ order_item_id: { $in: orderItemObjectIds } });
    }
    if (orderObjectIds.length) {
      referenceFilters.push({ order_id: { $in: orderObjectIds } });
    }
    if (!referenceFilters.length) {
      return {
        byItem: new Map(),
        byOrder: new Map(),
      };
    }

    const [lookup = {}] = await safeAggregate(collectionName, [
      {
        $match:
          referenceFilters.length === 1 ? referenceFilters[0] : { $or: referenceFilters },
      },
      {
        $project: {
          orderItemKey: {
            $convert: {
              input: '$order_item_id',
              to: 'string',
              onError: null,
              onNull: null,
            },
          },
          orderKey: {
            $convert: {
              input: '$order_id',
              to: 'string',
              onError: null,
              onNull: null,
            },
          },
          issueDate: {
            $ifNull: ['$createdAt', '$updatedAt'],
          },
          issuedQty: qtyExpr,
        },
      },
      {
        $match: {
          issueDate: { $ne: null },
        },
      },
      {
        $facet: {
          byItem: [
            { $match: { orderItemKey: { $ne: null } } },
            {
              $group: {
                _id: '$orderItemKey',
                issueDate: { $min: '$issueDate' },
                issuedQty: { $sum: '$issuedQty' },
              },
            },
          ],
          byOrder: [
            { $match: { orderKey: { $ne: null } } },
            {
              $group: {
                _id: '$orderKey',
                issueDate: { $min: '$issueDate' },
                issuedQty: { $sum: '$issuedQty' },
              },
            },
          ],
        },
      },
    ]);

    return {
      byItem: new Map(
        (lookup?.byItem || []).map((row) => [
          row._id,
          { issueDate: row.issueDate, issuedQty: Number(row?.issuedQty || 0) },
        ])
      ),
      byOrder: new Map(
        (lookup?.byOrder || []).map((row) => [
          row._id,
          { issueDate: row.issueDate, issuedQty: Number(row?.issuedQty || 0) },
        ])
      ),
    };
  };
  const buildIssuedOrderMetricsLookup = async (orderItemObjectIds, orderObjectIds) => {
    const referenceFilters = [];
    if (orderItemObjectIds.length) {
      referenceFilters.push({ order_item_id: { $in: orderItemObjectIds } });
    }
    if (orderObjectIds.length) {
      referenceFilters.push({ order_id: { $in: orderObjectIds } });
    }
    if (!referenceFilters.length) {
      return {
        byItem: new Map(),
        byOrder: new Map(),
      };
    }

    const [lookup = {}] = await safeAggregate('issued_for_order_items', [
      {
        $match: referenceFilters.length === 1 ? referenceFilters[0] : { $or: referenceFilters },
      },
      {
        $project: {
          orderItemKey: {
            $convert: {
              input: '$order_item_id',
              to: 'string',
              onError: null,
              onNull: null,
            },
          },
          orderKey: {
            $convert: {
              input: '$order_id',
              to: 'string',
              onError: null,
              onNull: null,
            },
          },
          issuedSheets: {
            $ifNull: [
              '$item_details.no_of_sheets',
              { $ifNull: ['$item_details.no_of_sheet', 0] },
            ],
          },
          issuedCmt: {
            $ifNull: [
              '$item_details.physical_cmt',
              {
                $ifNull: [
                  '$item_details.flitch_cmt',
                  {
                    $ifNull: ['$item_details.cmt', 0],
                  },
                ],
              },
            ],
          },
          issuedQuantity: {
            $ifNull: [
              '$item_details.issued_quantity',
              { $ifNull: ['$item_details.quantity', 0] },
            ],
          },
        },
      },
      {
        $facet: {
          byItem: [
            { $match: { orderItemKey: { $ne: null } } },
            {
              $group: {
                _id: '$orderItemKey',
                issuedSheets: { $sum: '$issuedSheets' },
                issuedCmt: { $sum: '$issuedCmt' },
                issuedQuantity: { $sum: '$issuedQuantity' },
              },
            },
          ],
          byOrder: [
            { $match: { orderKey: { $ne: null } } },
            {
              $group: {
                _id: '$orderKey',
                issuedSheets: { $sum: '$issuedSheets' },
                issuedCmt: { $sum: '$issuedCmt' },
                issuedQuantity: { $sum: '$issuedQuantity' },
              },
            },
          ],
        },
      },
    ]);

    return {
      byItem: new Map(
        (lookup?.byItem || []).map((row) => [
          row._id,
          {
            issuedSheets: Number(row?.issuedSheets || 0),
            issuedCmt: Number(row?.issuedCmt || 0),
            issuedQuantity: Number(row?.issuedQuantity || 0),
          },
        ])
      ),
      byOrder: new Map(
        (lookup?.byOrder || []).map((row) => [
          row._id,
          {
            issuedSheets: Number(row?.issuedSheets || 0),
            issuedCmt: Number(row?.issuedCmt || 0),
            issuedQuantity: Number(row?.issuedQuantity || 0),
          },
        ])
      ),
    };
  };
  const buildProcessDamageLookup = async (orderItemObjectIds, orderObjectIds) => {
    const buildDamageLookup = async (
      collectionName,
      {
        prePipeline = [],
        orderItemExpr = '$order_item_id',
        orderExpr = '$order_id',
        qtyExpr = { $ifNull: ['$no_of_sheets', 0] },
      } = {}
    ) => {
      const referenceFilters = [];
      if (orderItemObjectIds.length) {
        referenceFilters.push({ orderItemId: { $in: orderItemObjectIds } });
      }
      if (orderObjectIds.length) {
        referenceFilters.push({ orderId: { $in: orderObjectIds } });
      }
      if (!referenceFilters.length) {
        return {
          byItem: new Map(),
          byOrder: new Map(),
        };
      }

      const [lookup = {}] = await safeAggregate(collectionName, [
        ...prePipeline,
        {
          $project: {
            orderItemId: orderItemExpr,
            orderId: orderExpr,
            damageQty: qtyExpr,
          },
        },
        {
          $match:
            referenceFilters.length === 1
              ? referenceFilters[0]
              : { $or: referenceFilters },
        },
        {
          $project: {
            orderItemKey: {
              $convert: {
                input: '$orderItemId',
                to: 'string',
                onError: null,
                onNull: null,
              },
            },
            orderKey: {
              $convert: {
                input: '$orderId',
                to: 'string',
                onError: null,
                onNull: null,
              },
            },
            damageQty: 1,
          },
        },
        {
          $facet: {
            byItem: [
              { $match: { orderItemKey: { $ne: null } } },
              {
                $group: {
                  _id: '$orderItemKey',
                  damageQty: { $sum: '$damageQty' },
                },
              },
            ],
            byOrder: [
              { $match: { orderKey: { $ne: null } } },
              {
                $group: {
                  _id: '$orderKey',
                  damageQty: { $sum: '$damageQty' },
                },
              },
            ],
          },
        },
      ]);

      return {
        byItem: new Map(
          (lookup?.byItem || []).map((row) => [
            row._id,
            { damageQty: Number(row?.damageQty || 0) },
          ])
        ),
        byOrder: new Map(
          (lookup?.byOrder || []).map((row) => [
            row._id,
            { damageQty: Number(row?.damageQty || 0) },
          ])
        ),
      };
    };
    const mergeLookupPayloads = (lookups = []) => {
      const merged = {
        byItem: new Map(),
        byOrder: new Map(),
      };

      lookups.forEach((lookup) => {
        lookup.byItem.forEach((payload, id) => {
          const current = merged.byItem.get(id) || { damageQty: 0 };
          merged.byItem.set(id, {
            damageQty: current.damageQty + Number(payload?.damageQty || 0),
          });
        });
        lookup.byOrder.forEach((payload, id) => {
          const current = merged.byOrder.get(id) || { damageQty: 0 };
          merged.byOrder.set(id, {
            damageQty: current.damageQty + Number(payload?.damageQty || 0),
          });
        });
      });

      return merged;
    };

    const [pressingDamageLookup, cncDamageLookup, colourDamageLookup] =
      await Promise.all([
        buildDamageLookup('pressing_damage', {
          prePipeline: [
            {
              $lookup: {
                from: 'pressing_done_details',
                localField: 'pressing_done_details_id',
                foreignField: '_id',
                as: 'pressingDone',
              },
            },
            {
              $unwind: {
                path: '$pressingDone',
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          orderItemExpr: '$pressingDone.order_item_id',
          orderExpr: '$pressingDone.order_id',
        }),
        buildDamageLookup('cnc_damage_details', {
          prePipeline: [
            {
              $lookup: {
                from: 'cnc_done_details',
                localField: 'cnc_done_id',
                foreignField: '_id',
                as: 'cncDone',
              },
            },
            {
              $unwind: {
                path: '$cncDone',
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $lookup: {
                from: 'issued_for_cnc_details',
                localField: 'cncDone.issue_for_cnc_id',
                foreignField: '_id',
                as: 'cncIssue',
              },
            },
            {
              $unwind: {
                path: '$cncIssue',
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          orderItemExpr: '$cncIssue.order_item_id',
          orderExpr: '$cncIssue.order_id',
        }),
        buildDamageLookup('color_damage_details', {
          prePipeline: [
            {
              $lookup: {
                from: 'color_done_details',
                localField: 'color_done_id',
                foreignField: '_id',
                as: 'colourDone',
              },
            },
            {
              $unwind: {
                path: '$colourDone',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'issued_for_color_details',
                localField: 'colourDone.issue_for_color_id',
                foreignField: '_id',
                as: 'colourIssue',
              },
            },
            {
              $unwind: {
                path: '$colourIssue',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          orderItemExpr: {
            $ifNull: ['$order_item_id', '$colourIssue.order_item_id'],
          },
          orderExpr: '$colourIssue.order_id',
        }),
      ]);

    return mergeLookupPayloads([
      pressingDamageLookup,
      cncDamageLookup,
      colourDamageLookup,
    ]);
  };
  const resolveLookupPayload = (lookup, orderItemId, orderId) =>
    lookup.byItem.get(orderItemId) || lookup.byOrder.get(orderId) || null;

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
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: combineMatch(
            dateMatch('order_details.orderDate', fromDate, toDate),
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
            orderDate: '$order_details.orderDate',
            customerName: {
              $ifNull: ['$order_details.owner_name', 'UNKNOWN'],
            },
            itemName: {
              $ifNull: ['$item_name', '$sales_item_name'],
            },
            photoNo: '$photo_number',
            rawMaterial: {
              $ifNull: ['$raw_material', '$order_details.raw_materials'],
            },
            unitName: {
              $ifNull: ['$unit_name', null],
            },
            sheetsOrdered: source.qtyExpr,
            orderedCmt: {
              $ifNull: ['$cbm', 0],
            },
            orderedQuantity: {
              $ifNull: ['$quantity', 0],
            },
            qtySheets: source.qtyExpr,
            qtyRolls: {
              $ifNull: ['$number_of_roll', { $ifNull: ['$no_of_roll', 0] }],
            },
            qtyCmt: {
              $ifNull: ['$cmt', { $ifNull: ['$cbm', 0] }],
            },
            qtySqm: { $ifNull: ['$sqm', 0] },
            dispatchedSheets: { $ifNull: ['$dispatch_no_of_sheets', 0] },
            damageSheets: {
              $ifNull: ['$damage_no_of_sheets', { $ifNull: ['$damage', 0] }],
            },
            orderId: {
              $ifNull: ['$order_id', '$order_details._id'],
            },
            orderItemId: {
              $ifNull: ['$order_item_id', '$_id'],
            },
            priorityRaw: {
              $ifNull: [
                '$priority',
                {
                  $ifNull: [
                    '$priority_level',
                    {
                      $ifNull: [
                        '$order_details.priority',
                        {
                          $ifNull: [
                            '$dispatch_schedule',
                            '$order_details.dispatch_schedule',
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            pressingDate: null,
            cncDate: null,
            colourDate: null,
            statusRaw: '$item_status',
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

  const orderItemIds = new Set();
  const orderIds = new Set();
  rowsByCollection.forEach(({ rows }) => {
    (rows || []).forEach((row) => {
      const orderItemId = normalizeId(row?.orderItemId);
      const orderId = normalizeId(row?.orderId);
      if (orderItemId) orderItemIds.add(orderItemId);
      if (orderId) orderIds.add(orderId);
    });
  });

  const orderItemObjectIds = toObjectIds(orderItemIds);
  const orderObjectIds = toObjectIds(orderIds);
  const [
    pressingIssueLookup,
    cncIssueLookup,
    colourIssueLookup,
    issuedOrderLookup,
    processDamageLookup,
  ] =
    await Promise.all([
      buildStageProcessLookup(
        'issues_for_pressings',
        { $ifNull: ['$no_of_sheets', 0] },
        orderItemObjectIds,
        orderObjectIds
      ),
      buildStageProcessLookup(
        'issued_for_cnc_details',
        { $ifNull: ['$issued_sheets', { $ifNull: ['$no_of_sheets', 0] }] },
        orderItemObjectIds,
        orderObjectIds
      ),
      buildStageProcessLookup(
        'issued_for_color_details',
        { $ifNull: ['$issued_sheets', { $ifNull: ['$no_of_sheets', 0] }] },
        orderItemObjectIds,
        orderObjectIds
      ),
      buildIssuedOrderMetricsLookup(orderItemObjectIds, orderObjectIds),
      buildProcessDamageLookup(orderItemObjectIds, orderObjectIds),
    ]);

  rowsByCollection.forEach(({ key, rows }) => {
    byType[key] = (rows || []).map((row) => {
      const orderItemId = normalizeId(row?.orderItemId);
      const orderId = normalizeId(row?.orderId);
      const rawMaterial = String(row?.rawMaterial || '').trim().toUpperCase();
      const isRaw = key === 'RAW';
      const isRawLogOrFlitch = isRaw && ['LOG', 'FLITCH'].includes(rawMaterial);
      const isRawStore = isRaw && ['STORE', 'OTHER_GOODS', 'OTHER GOODS'].includes(rawMaterial);

      const issuedOrderMetrics = resolveLookupPayload(
        issuedOrderLookup,
        orderItemId,
        orderId
      );
      const pressingStage = resolveLookupPayload(pressingIssueLookup, orderItemId, orderId);
      const cncStage = resolveLookupPayload(cncIssueLookup, orderItemId, orderId);
      const colourStage = resolveLookupPayload(colourIssueLookup, orderItemId, orderId);
      const processDamage = resolveLookupPayload(processDamageLookup, orderItemId, orderId);

      const sheetsOrdered = round2(row?.sheetsOrdered || 0);
      const orderedCmt = round2(row?.orderedCmt || 0);
      const orderedQuantity = round2(row?.orderedQuantity || 0);

      const dispatchedSheets = round2(
        issuedOrderMetrics?.issuedSheets || row?.dispatchedSheets || 0
      );
      const dispatchedCmt = round2(issuedOrderMetrics?.issuedCmt || 0);
      const dispatchedQuantity = round2(issuedOrderMetrics?.issuedQuantity || 0);

      const itemLevelDamageSheets = round2(row?.damageSheets || 0);
      const processDamageSheets = round2(processDamage?.damageQty || 0);
      const damageSheets = round2(
        Math.max(itemLevelDamageSheets, processDamageSheets)
      );

      const orderedDisplay = isRawLogOrFlitch
        ? orderedCmt
        : isRawStore
          ? orderedQuantity
          : sheetsOrdered;
      const dispatchedDisplay = isRawLogOrFlitch
        ? dispatchedCmt
        : isRawStore
          ? dispatchedQuantity
          : dispatchedSheets;
      const damageDisplay = isRaw ? 0 : damageSheets;
      const balance = round2(
        Math.max(orderedDisplay - dispatchedDisplay - damageDisplay, 0)
      );

      const priority = normalizeOrderPriorityLabel(row?.priorityRaw);
      const rawStatus = String(row?.statusRaw || '').trim();
      const status = rawStatus
        ? rawStatus
            .toLowerCase()
            .split(/[\s_]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        : orderedDisplay > 0
          ? balance > 0
            ? 'Pending'
            : 'Completed'
          : 'Pending';

      return {
        productCategory: row?.productCategory || ORDER_TABLE_SOURCES.find((source) => source.key === key)?.label || key,
        orderNo: row?.orderNo || '-',
        orderDate: row?.orderDate || null,
        customerName: row?.customerName || 'UNKNOWN',
        itemName: row?.itemName || '-',
        photoNo: row?.photoNo || '-',
        rawMaterial: row?.rawMaterial || null,
        unitName: row?.unitName || null,
        orderedQuantity,
        sheetsOrdered: orderedDisplay,
        qtySheets: isRawStore ? orderedQuantity : round2(row?.qtySheets || 0),
        qtyRolls: round2(row?.qtyRolls || 0),
        qtyCmt: isRawLogOrFlitch
          ? round2(row?.qtyCmt || row?.orderedCmt || 0)
          : round2(row?.qtyCmt || 0),
        qtySqm: round2(row?.qtySqm || 0),
        dispatched: dispatchedDisplay,
        damage: damageDisplay,
        balance,
        priority,
        pressing:
          isRaw ? null : round2(pressingStage?.issuedQty || 0),
        cnc:
          isRaw ? null : round2(cncStage?.issuedQty || 0),
        colour:
          isRaw ? null : round2(colourStage?.issuedQty || 0),
        pressingDate: pressingStage?.issueDate || null,
        cncDate: cncStage?.issueDate || null,
        colourDate: colourStage?.issueDate || null,
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
      const pressingDate = asDate(row?.pressingDate);
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
        priority: row?.priority || '-',
        pressingScheduleDate: row?.pressingDate || null,
        cncScheduleDate: row?.cncDate || null,
        colourScheduleDate: row?.colourDate || null,
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
