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
    if (typeof value === 'object') {
      if (typeof value.toHexString === 'function') {
        const hex = String(value.toHexString() || '').trim();
        return hex || null;
      }
      if (typeof value.valueOf === 'function') {
        const primitive = value.valueOf();
        if (typeof primitive === 'string') {
          const trimmedPrimitive = primitive.trim();
          if (trimmedPrimitive) return trimmedPrimitive;
        }
      }
      if (typeof value.$oid === 'string') {
        const oid = value.$oid.trim();
        return oid || null;
      }
    }
    const asText = String(value).trim();
    return asText && asText !== '[object Object]' ? asText : null;
  };
  const toObjectIds = (idSet) =>
    [...idSet]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
  const normalizeLookupKey = (value) => String(value || '').trim().toUpperCase();
  const buildIdReferenceFilters = ({
    orderItemField = 'order_item_id',
    orderField = 'order_id',
    orderItemIds = [],
    orderIds = [],
    orderItemObjectIds = [],
    orderObjectIds = [],
  } = {}) => {
    const referenceFilters = [];
    const itemFilters = [];
    const orderFilters = [];

    if (orderItemObjectIds.length) {
      itemFilters.push({ [orderItemField]: { $in: orderItemObjectIds } });
    }
    if (orderItemIds.length) {
      itemFilters.push({ [orderItemField]: { $in: orderItemIds } });
    }
    if (itemFilters.length === 1) {
      referenceFilters.push(itemFilters[0]);
    } else if (itemFilters.length > 1) {
      referenceFilters.push({ $or: itemFilters });
    }

    if (orderObjectIds.length) {
      orderFilters.push({ [orderField]: { $in: orderObjectIds } });
    }
    if (orderIds.length) {
      orderFilters.push({ [orderField]: { $in: orderIds } });
    }
    if (orderFilters.length === 1) {
      referenceFilters.push(orderFilters[0]);
    } else if (orderFilters.length > 1) {
      referenceFilters.push({ $or: orderFilters });
    }

    return referenceFilters;
  };
  const buildStageProcessLookup = async (
    collectionName,
    qtyExpr,
    {
      orderItemIds = [],
      orderIds = [],
      orderItemObjectIds = [],
      orderObjectIds = [],
    } = {}
  ) => {
    const referenceFilters = buildIdReferenceFilters({
      orderItemIds,
      orderIds,
      orderItemObjectIds,
      orderObjectIds,
    });
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
  const buildStageDoneHistoryLookup = async (
    sources = [],
    {
      orderItemIds = [],
      orderIds = [],
      orderItemObjectIds = [],
      orderObjectIds = [],
    } = {}
  ) => {
    const buildStageQtyLookup = async (
      collectionName,
      {
        prePipeline = [],
        orderItemExpr = '$order_item_id',
        orderExpr = '$order_id',
        qtyExpr = { $ifNull: ['$no_of_sheets', 0] },
      } = {}
    ) => {
      const referenceFilters = buildIdReferenceFilters({
        orderItemField: 'orderItemId',
        orderField: 'orderId',
        orderItemIds,
        orderIds,
        orderItemObjectIds,
        orderObjectIds,
      });
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
            stageQty: qtyExpr,
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
            stageQty: 1,
          },
        },
        {
          $facet: {
            byItem: [
              { $match: { orderItemKey: { $ne: null } } },
              {
                $group: {
                  _id: '$orderItemKey',
                  stageQty: { $sum: '$stageQty' },
                },
              },
            ],
            byOrder: [
              { $match: { orderKey: { $ne: null } } },
              {
                $group: {
                  _id: '$orderKey',
                  stageQty: { $sum: '$stageQty' },
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
            { stageQty: Number(row?.stageQty || 0) },
          ])
        ),
        byOrder: new Map(
          (lookup?.byOrder || []).map((row) => [
            row._id,
            { stageQty: Number(row?.stageQty || 0) },
          ])
        ),
      };
    };

    const lookups = await Promise.all(
      (sources || []).map((source) =>
        buildStageQtyLookup(source.collection, {
          prePipeline: source.prePipeline || [],
          orderItemExpr: source.orderItemExpr,
          orderExpr: source.orderExpr,
          qtyExpr: source.qtyExpr,
        })
      )
    );

    const merged = {
      byItem: new Map(),
      byOrder: new Map(),
    };

    lookups.forEach((lookup) => {
      lookup.byItem.forEach((payload, id) => {
        const current = merged.byItem.get(id) || { stageQty: 0 };
        merged.byItem.set(id, {
          stageQty: current.stageQty + Number(payload?.stageQty || 0),
        });
      });
      lookup.byOrder.forEach((payload, id) => {
        const current = merged.byOrder.get(id) || { stageQty: 0 };
        merged.byOrder.set(id, {
          stageQty: current.stageQty + Number(payload?.stageQty || 0),
        });
      });
    });

    return merged;
  };
  const buildIssuedOrderMetricsLookup = async ({
    orderItemIds = [],
    orderIds = [],
    orderItemObjectIds = [],
    orderObjectIds = [],
  } = {}) => {
    const referenceFilters = buildIdReferenceFilters({
      orderItemIds,
      orderIds,
      orderItemObjectIds,
      orderObjectIds,
    });
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
  const buildDispatchedOrderMetricsLookup = async ({
    orderItemIds = [],
    orderIds = [],
    orderItemObjectIds = [],
    orderObjectIds = [],
  } = {}) => {
    const referenceFilters = buildIdReferenceFilters({
      orderItemIds,
      orderIds,
      orderItemObjectIds,
      orderObjectIds,
    });
    if (!referenceFilters.length) {
      return {
        byItem: new Map(),
        byOrder: new Map(),
        byOrderNoItem: new Map(),
      };
    }

    const [lookup = {}] = await safeAggregate('dispatch_items', [
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
          dispatchedSheets: { $ifNull: ['$no_of_sheets', 0] },
          dispatchedCmt: { $ifNull: ['$cmt', { $ifNull: ['$cbm', 0] }] },
          dispatchedQuantity: { $ifNull: ['$quantity', 0] },
          orderNoKey: {
            $trim: {
              input: {
                $toUpper: {
                  $ifNull: ['$order_no', ''],
                },
              },
            },
          },
          itemNameKey: {
            $trim: {
              input: {
                $toUpper: {
                  $ifNull: ['$item_name', { $ifNull: ['$sales_item_name', ''] }],
                },
              },
            },
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
                dispatchedSheets: { $sum: '$dispatchedSheets' },
                dispatchedCmt: { $sum: '$dispatchedCmt' },
                dispatchedQuantity: { $sum: '$dispatchedQuantity' },
              },
            },
          ],
          byOrder: [
            { $match: { orderKey: { $ne: null } } },
            {
              $group: {
                _id: '$orderKey',
                dispatchedSheets: { $sum: '$dispatchedSheets' },
                dispatchedCmt: { $sum: '$dispatchedCmt' },
                dispatchedQuantity: { $sum: '$dispatchedQuantity' },
              },
            },
          ],
          byOrderNoItem: [
            {
              $match: {
                orderNoKey: { $ne: '' },
                itemNameKey: { $ne: '' },
              },
            },
            {
              $group: {
                _id: {
                  orderNoKey: '$orderNoKey',
                  itemNameKey: '$itemNameKey',
                },
                dispatchedSheets: { $sum: '$dispatchedSheets' },
                dispatchedCmt: { $sum: '$dispatchedCmt' },
                dispatchedQuantity: { $sum: '$dispatchedQuantity' },
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
            dispatchedSheets: Number(row?.dispatchedSheets || 0),
            dispatchedCmt: Number(row?.dispatchedCmt || 0),
            dispatchedQuantity: Number(row?.dispatchedQuantity || 0),
          },
        ])
      ),
      byOrder: new Map(
        (lookup?.byOrder || []).map((row) => [
          row._id,
          {
            dispatchedSheets: Number(row?.dispatchedSheets || 0),
            dispatchedCmt: Number(row?.dispatchedCmt || 0),
            dispatchedQuantity: Number(row?.dispatchedQuantity || 0),
          },
        ])
      ),
      byOrderNoItem: new Map(
        (lookup?.byOrderNoItem || []).map((row) => [
          `${normalizeLookupKey(row?._id?.orderNoKey)}::${normalizeLookupKey(row?._id?.itemNameKey)}`,
          {
            dispatchedSheets: Number(row?.dispatchedSheets || 0),
            dispatchedCmt: Number(row?.dispatchedCmt || 0),
            dispatchedQuantity: Number(row?.dispatchedQuantity || 0),
          },
        ])
      ),
    };
  };
  const buildProcessDamageLookup = async ({
    orderItemIds = [],
    orderIds = [],
    orderItemObjectIds = [],
    orderObjectIds = [],
  } = {}) => {
    const buildDamageLookup = async (
      collectionName,
      {
        prePipeline = [],
        orderItemExpr = '$order_item_id',
        orderExpr = '$order_id',
        qtyExpr = { $ifNull: ['$no_of_sheets', 0] },
      } = {}
    ) => {
      const referenceFilters = buildIdReferenceFilters({
        orderItemField: 'orderItemId',
        orderField: 'orderId',
        orderItemIds,
        orderIds,
        orderItemObjectIds,
        orderObjectIds,
      });
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

    const [
      tappingDamageLookup,
      pressingDamageLookup,
      cncDamageLookup,
      colourDamageLookup,
      bunitoDamageLookup,
      canvasDamageLookup,
      polishingDamageLookup,
    ] =
      await Promise.all([
        buildDamageLookup('issue_for_tapping_wastages', {
          prePipeline: [
            {
              $lookup: {
                from: 'issue_for_tappings',
                localField: 'issue_for_tapping_item_id',
                foreignField: '_id',
                as: 'tappingIssue',
              },
            },
            {
              $unwind: {
                path: '$tappingIssue',
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          orderItemExpr: '$tappingIssue.order_item_id',
          orderExpr: '$tappingIssue.order_id',
          qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
        }),
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
        buildDamageLookup('bunito_damage_details', {
          prePipeline: [
            {
              $lookup: {
                from: 'bunito_done_details',
                localField: 'bunito_done_id',
                foreignField: '_id',
                as: 'bunitoDone',
              },
            },
            {
              $unwind: {
                path: '$bunitoDone',
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $lookup: {
                from: 'issued_for_bunito_details',
                localField: 'bunitoDone.issue_for_bunito_id',
                foreignField: '_id',
                as: 'bunitoIssue',
              },
            },
            {
              $unwind: {
                path: '$bunitoIssue',
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          orderItemExpr: '$bunitoIssue.order_item_id',
          orderExpr: '$bunitoIssue.order_id',
        }),
        buildDamageLookup('canvas_damage_details', {
          prePipeline: [
            {
              $lookup: {
                from: 'canvas_done_details',
                localField: 'canvas_done_id',
                foreignField: '_id',
                as: 'canvasDone',
              },
            },
            {
              $unwind: {
                path: '$canvasDone',
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $lookup: {
                from: 'issued_for_canvas_details',
                localField: 'canvasDone.issue_for_canvas_id',
                foreignField: '_id',
                as: 'canvasIssue',
              },
            },
            {
              $unwind: {
                path: '$canvasIssue',
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          orderItemExpr: '$canvasIssue.order_item_id',
          orderExpr: '$canvasIssue.order_id',
        }),
        buildDamageLookup('polishing_damage_details', {
          prePipeline: [
            {
              $lookup: {
                from: 'polishing_done_details',
                localField: 'polishing_done_id',
                foreignField: '_id',
                as: 'polishingDone',
              },
            },
            {
              $unwind: {
                path: '$polishingDone',
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $lookup: {
                from: 'issued_for_polishing_details',
                localField: 'polishingDone.issue_for_polishing_id',
                foreignField: '_id',
                as: 'polishingIssue',
              },
            },
            {
              $unwind: {
                path: '$polishingIssue',
                preserveNullAndEmptyArrays: false,
              },
            },
          ],
          orderItemExpr: '$polishingIssue.order_item_id',
          orderExpr: '$polishingIssue.order_id',
        }),
      ]);

    return mergeLookupPayloads([
      tappingDamageLookup,
      pressingDamageLookup,
      cncDamageLookup,
      colourDamageLookup,
      bunitoDamageLookup,
      canvasDamageLookup,
      polishingDamageLookup,
    ]);
  };
  const resolveLookupPayload = (lookup, orderItemId, orderId) =>
    lookup.byItem.get(orderItemId) || lookup.byOrder.get(orderId) || null;
  const resolveLookupPayloadByItem = (lookup, orderItemId) =>
    lookup?.byItem?.get(orderItemId) || null;

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
            amount: { $ifNull: ['$amount', 0] },
            dispatchedSheets: {
              $ifNull: [
                '$dispatch_no_of_sheets',
                { $ifNull: ['$dispatch_no_of_sheet', 0] },
              ],
            },
            damageSheets: {
              $ifNull: [
                '$damage_no_of_sheets',
                {
                  $ifNull: [
                    '$damage_no_of_sheet',
                    {
                      $ifNull: [
                        '$damage_sheets',
                        {
                          $ifNull: [
                            '$no_of_damage_sheets',
                            { $ifNull: ['$damage', 0] },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
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

  const orderItemIdList = [...orderItemIds];
  const orderIdList = [...orderIds];
  const orderItemObjectIds = toObjectIds(orderItemIds);
  const orderObjectIds = toObjectIds(orderIds);
  const lookupIds = {
    orderItemIds: orderItemIdList,
    orderIds: orderIdList,
    orderItemObjectIds,
    orderObjectIds,
  };
  const [
    pressingIssueLookup,
    cncIssueLookup,
    colourIssueLookup,
    pressingDoneHistoryLookup,
    cncDoneHistoryLookup,
    colourDoneHistoryLookup,
    issuedOrderLookup,
    dispatchedOrderLookup,
    processDamageLookup,
  ] =
    await Promise.all([
      buildStageProcessLookup(
        'issues_for_pressings',
        { $ifNull: ['$no_of_sheets', 0] },
        lookupIds
      ),
      buildStageProcessLookup(
        'issued_for_cnc_details',
        { $ifNull: ['$issued_sheets', { $ifNull: ['$no_of_sheets', 0] }] },
        lookupIds
      ),
      buildStageProcessLookup(
        'issued_for_color_details',
        { $ifNull: ['$issued_sheets', { $ifNull: ['$no_of_sheets', 0] }] },
        lookupIds
      ),
      buildStageDoneHistoryLookup(
        [
          {
            collection: 'pressing_done_details',
            orderItemExpr: '$order_item_id',
            orderExpr: '$order_id',
            qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
          },
          {
            collection: 'pressing_done_history',
            orderItemExpr: '$order_item_id',
            orderExpr: '$order_id',
            qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
          },
        ],
        lookupIds
      ),
      buildStageDoneHistoryLookup(
        [
          {
            collection: 'cnc_done_details',
            prePipeline: [
              {
                $lookup: {
                  from: 'issued_for_cnc_details',
                  localField: 'issue_for_cnc_id',
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
            qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
          },
          {
            collection: 'cnc_history_details',
            orderItemExpr: '$order_item_id',
            orderExpr: '$order_id',
            qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
          },
        ],
        lookupIds
      ),
      buildStageDoneHistoryLookup(
        [
          {
            collection: 'color_done_details',
            prePipeline: [
              {
                $lookup: {
                  from: 'issued_for_color_details',
                  localField: 'issue_for_color_id',
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
            qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
          },
          {
            collection: 'color_history_details',
            orderItemExpr: '$order_item_id',
            orderExpr: '$order_id',
            qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
          },
        ],
        lookupIds
      ),
      buildIssuedOrderMetricsLookup(lookupIds),
      buildDispatchedOrderMetricsLookup(lookupIds),
      buildProcessDamageLookup(lookupIds),
    ]);

  rowsByCollection.forEach(({ key, rows }) => {
    byType[key] = (rows || []).map((row) => {
      const orderItemId = normalizeId(row?.orderItemId);
      const orderId = normalizeId(row?.orderId);
      const rawMaterial = String(row?.rawMaterial || '').trim().toUpperCase();
      const isRaw = key === 'RAW';
      const isDecorativeOrSeries = key === 'DECORATIVE' || key === 'SERIES';
      const isRawLogOrFlitch = isRaw && ['LOG', 'FLITCH'].includes(rawMaterial);
      const isRawStore = isRaw && ['STORE', 'OTHER_GOODS', 'OTHER GOODS'].includes(rawMaterial);

      const issuedOrderMetrics = resolveLookupPayload(
        issuedOrderLookup,
        orderItemId,
        orderId
      );
      const issuedOrderMetricsByItem = resolveLookupPayloadByItem(
        issuedOrderLookup,
        orderItemId
      );
      const dispatchedOrderMetrics = resolveLookupPayloadByItem(
        dispatchedOrderLookup,
        orderItemId
      );
      const dispatchedByOrderNoItem =
        dispatchedOrderLookup?.byOrderNoItem?.get(
          `${normalizeLookupKey(row?.orderNo)}::${normalizeLookupKey(row?.itemName)}`
        ) || null;
      const pressingStageForDispatch = resolveLookupPayload(
        pressingIssueLookup,
        orderItemId,
        orderId
      );
      const cncStageForDispatch = resolveLookupPayload(
        cncIssueLookup,
        orderItemId,
        orderId
      );
      const colourStageForDispatch = resolveLookupPayload(
        colourIssueLookup,
        orderItemId,
        orderId
      );
      const pressingStage = resolveLookupPayload(
        pressingDoneHistoryLookup,
        orderItemId,
        orderId
      );
      const cncStage = resolveLookupPayload(
        cncDoneHistoryLookup,
        orderItemId,
        orderId
      );
      const colourStage = resolveLookupPayload(
        colourDoneHistoryLookup,
        orderItemId,
        orderId
      );
      const processDamage = resolveLookupPayload(processDamageLookup, orderItemId, orderId);

      const sheetsOrdered = round2(row?.sheetsOrdered || 0);
      const orderedCmt = round2(row?.orderedCmt || 0);
      const orderedQuantity = round2(row?.orderedQuantity || 0);

      const stageIssuedSheets = Math.max(
        Number(pressingStageForDispatch?.issuedQty || 0),
        Number(cncStageForDispatch?.issuedQty || 0),
        Number(colourStageForDispatch?.issuedQty || 0)
      );
      const dispatchSheetsFromDispatchRecords = Math.max(
        Number(dispatchedByOrderNoItem?.dispatchedSheets || 0),
        Number(dispatchedOrderMetrics?.dispatchedSheets || 0),
        Number(row?.dispatchedSheets || 0)
      );
      const dispatchSheetsFromFallbackIssued = Math.max(
        Number(issuedOrderMetricsByItem?.issuedSheets || 0),
        Number(issuedOrderMetrics?.issuedSheets || 0),
        Number(stageIssuedSheets || 0)
      );
      const dispatchSheetsCandidate = isRaw
        ? dispatchSheetsFromDispatchRecords
        : isDecorativeOrSeries
          ? dispatchSheetsFromDispatchRecords
          : Math.max(dispatchSheetsFromDispatchRecords, dispatchSheetsFromFallbackIssued);
      const dispatchedSheets = round2(
        Math.min(
          Number(sheetsOrdered || 0),
          Number(dispatchSheetsCandidate || 0)
        )
      );
      const dispatchCmtFromDispatchRecords = Math.max(
        Number(dispatchedByOrderNoItem?.dispatchedCmt || 0),
        Number(dispatchedOrderMetrics?.dispatchedCmt || 0)
      );
      const dispatchCmtFromFallbackIssued = Math.max(
        Number(issuedOrderMetricsByItem?.issuedCmt || 0),
        Number(issuedOrderMetrics?.issuedCmt || 0)
      );
      const dispatchCmtCandidate = isRaw
        ? dispatchCmtFromDispatchRecords
        : Math.max(dispatchCmtFromDispatchRecords, dispatchCmtFromFallbackIssued);
      const dispatchedCmt = round2(
        Math.min(
          Number(orderedCmt || 0),
          Number(dispatchCmtCandidate || 0)
        )
      );
      const dispatchQuantityFromDispatchRecords = Math.max(
        Number(dispatchedByOrderNoItem?.dispatchedQuantity || 0),
        Number(dispatchedOrderMetrics?.dispatchedQuantity || 0)
      );
      const dispatchQuantityFromFallbackIssued = Math.max(
        Number(issuedOrderMetricsByItem?.issuedQuantity || 0),
        Number(issuedOrderMetrics?.issuedQuantity || 0)
      );
      const dispatchQuantityCandidate = isRaw
        ? dispatchQuantityFromDispatchRecords
        : Math.max(dispatchQuantityFromDispatchRecords, dispatchQuantityFromFallbackIssued);
      const dispatchedQuantity = round2(
        Math.min(
          Number(orderedQuantity || 0),
          Number(dispatchQuantityCandidate || 0)
        )
      );

      const itemLevelDamageSheets = round2(row?.damageSheets || 0);
      const processDamageSheets = round2(processDamage?.damageQty || 0);
      const damageSheets = round2(
        isDecorativeOrSeries
          ? processDamageSheets > 0
            ? processDamageSheets
            : itemLevelDamageSheets
          : itemLevelDamageSheets
      );

      const orderedDisplay = isRawLogOrFlitch
        ? orderedCmt
        : isRawStore
          ? orderedQuantity
          : sheetsOrdered;
      const dispatchedDisplayBase = isRawLogOrFlitch
        ? dispatchedCmt
        : isRawStore
          ? dispatchedQuantity
          : dispatchedSheets;
      const damageDisplay = damageSheets;
      const dispatchedDisplay = round2(
        Math.min(Number(dispatchedDisplayBase || 0), Number(orderedDisplay || 0))
      );
      const hasDamagedSheets = Number(damageDisplay || 0) > 0;
      const damageForBalance =
        isDecorativeOrSeries && hasDamagedSheets ? Number(damageDisplay || 0) : 0;
      const balance = round2(
        Math.max(orderedDisplay - dispatchedDisplay - damageForBalance, 0)
      );
      let pressingDisplayQty = null;
      let cncDisplayQty = null;
      let colourDisplayQty = null;

      if (!isRaw) {
        // Use issue-flow quantity first (actual movement to next process), and
        // keep done/history as fallback for legacy records.
        const resolveStageFlowQty = (issuePayload, donePayload) => {
          const issueQty = round2(issuePayload?.issuedQty || 0);
          if (issueQty > 0) return issueQty;
          const doneQty = round2(donePayload?.stageQty || 0);
          return doneQty > 0 ? doneQty : 0;
        };

        const flowCapQty = round2(
          Math.max(
            Number(orderedDisplay || 0) -
              (isDecorativeOrSeries && hasDamagedSheets ? Number(damageDisplay || 0) : 0),
            0
          )
        );

        const pressingQtyRaw = resolveStageFlowQty(pressingStageForDispatch, pressingStage);
        pressingDisplayQty = round2(
          Math.min(Number(pressingQtyRaw || 0), Number(flowCapQty || 0))
        );

        const cncQtyRaw = resolveStageFlowQty(cncStageForDispatch, cncStage);
        const cncUpperBound =
          Number(pressingDisplayQty || 0) > 0
            ? Number(pressingDisplayQty || 0)
            : Number(flowCapQty || 0);
        cncDisplayQty = round2(
          Math.min(Number(cncQtyRaw || 0), Number(cncUpperBound || 0))
        );

        const colourQtyRaw = resolveStageFlowQty(colourStageForDispatch, colourStage);
        const colourUpperBound =
          Number(cncDisplayQty || 0) > 0
            ? Number(cncDisplayQty || 0)
            : Number(cncUpperBound || 0);
        colourDisplayQty = round2(
          Math.min(Number(colourQtyRaw || 0), Number(colourUpperBound || 0))
        );
      }

      const priority = normalizeOrderPriorityLabel(row?.priorityRaw);
      const rawIsFullyDispatched =
        Number(orderedDisplay || 0) > 0 &&
        Number(dispatchedDisplay || 0) >= Number(orderedDisplay || 0) - 0.01;
      const dispatchStatus = isRaw
        ? rawIsFullyDispatched
          ? 'Completed'
          : 'Pending'
        : Number(balance || 0) <= 0.01
          ? 'Completed'
          : 'Pending';
      const normalizedRawOrderStatus = String(row?.statusRaw || '').trim().toUpperCase();
      const hasCancelledStatus = normalizedRawOrderStatus.includes('CANCEL');
      const orderStatus = hasCancelledStatus
        ? 'Cancelled'
        : dispatchStatus === 'Completed'
          ? 'Closed'
          : '-';

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
        amount: round2(row?.amount || 0),
        dispatched: dispatchedDisplay,
        damage: damageDisplay,
        balance,
        priority,
        pressing: pressingDisplayQty,
        cnc: cncDisplayQty,
        colour: colourDisplayQty,
        pressingDate: pressingStageForDispatch?.issueDate || null,
        cncDate: cncStageForDispatch?.issueDate || null,
        colourDate: colourStageForDispatch?.issueDate || null,
        orderStatus,
        dispatchStatus,
        status: dispatchStatus,
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
      const scheduleBalanceSheets = round2(row?.balance || 0);
      const computedStatus =
        Number(scheduleBalanceSheets || 0) <= 0
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
        balanceSheets: scheduleBalanceSheets,
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
        { $match: dateMatch('order_details.orderDate', fromDate, toDate) },
        {
          $group: {
            _id: '$order_id',
            qty: { $sum: source.qtyExpr || 0 },
            amount: { $sum: source.amountExpr || 0 },
          },
        },
        {
          $group: {
            _id: null,
            qty: { $sum: '$qty' },
            amount: { $sum: '$amount' },
            orders: { $sum: 1 },
          },
        },
      ]);
      return {
        category: source.category,
        qty: Number(summary?.qty || 0),
        amount: Number(summary?.amount || 0),
        orders: Number(summary?.orders || 0),
      };
    })
  );

  itemRows.forEach((row) => {
    categoryMap.set(row.category, {
      category: row.category,
      amount: round2(row.amount),
      qty: round2(row.qty),
      orders: Number(row.orders || 0),
    });
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
