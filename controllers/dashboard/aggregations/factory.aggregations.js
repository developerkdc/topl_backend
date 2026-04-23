export const createFactoryAggregations = (context) => {
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

const aggregateWipByStage = async ({ fromDate, toDate }) => {
  const rows = await Promise.all(
    WIP_STAGES.map(async (stage) => {
      const [summary] = await safeAggregate(stage.collection, [
        ...(Array.isArray(stage.preMatchPipeline) ? stage.preMatchPipeline : []),
        {
          $match: combineMatch(
            stage.baseMatch || null,
            dateMatch(stage.dateField, fromDate, toDate),
            stage.extraMatch || null
          ),
        },
        {
          $group: {
            _id: null,
            amount: { $sum: stage.amountExpr || 0 },
            qtySheets: { $sum: stage.qtySheetsExpr || 0 },
            qtySqm: { $sum: stage.qtySqmExpr || 0 },
            qtyUnits: { $sum: stage.qtyUnitsExpr || 0 },
          },
        },
      ]);

      return {
        stage: stage.stage,
        amount: round2(summary?.amount || 0),
        qtySheets: round2(summary?.qtySheets || 0),
        qtySqm: round2(summary?.qtySqm || 0),
        qtyUnits: round2(summary?.qtyUnits || 0),
      };
    })
  );

  return rows;
};


const aggregateProductionThroughput = async ({ fromDate, toDate }) => {
  const rows = await Promise.all(
    THROUGHPUT_STAGES.map(async (stage) => {
      const [summary] = await safeAggregate(stage.collection, [
        { $match: dateMatch(stage.dateField, fromDate, toDate) },
        {
          $group: {
            _id: null,
            amount: { $sum: stage.amountExpr || 0 },
            qtySheets: { $sum: stage.qtySheetsExpr || 0 },
            qtySqm: { $sum: stage.qtySqmExpr || 0 },
            qtyUnits: { $sum: stage.qtyUnitsExpr || 0 },
            records: { $sum: 1 },
          },
        },
      ]);

      const qtySheets = Number(summary?.qtySheets || 0);
      const qtySqm = Number(summary?.qtySqm || 0);
      const qtyUnits = Number(summary?.qtyUnits || 0);
      const primaryQty = qtySheets || qtySqm || qtyUnits;

      return {
        stage: stage.stage,
        amount: round2(summary?.amount || 0),
        qtySheets: round2(qtySheets),
        qtySqm: round2(qtySqm),
        qtyUnits: round2(qtyUnits),
        primaryQty: round2(primaryQty),
        records: Number(summary?.records || 0),
      };
    })
  );

  return rows;
};


const aggregateYieldByStage = async ({ fromDate, toDate }) => {
  const rows = await Promise.all(
    YIELD_STAGES.map(async (stage) => {
      const issueSources =
        Array.isArray(stage.issueSources) && stage.issueSources.length > 0
          ? stage.issueSources
          : [
              {
                collection: stage.issueCollection,
                dateField: stage.issueDateField,
                qtyExpr: stage.issuedQtyExpr,
                preMatchPipeline: stage.issuePreMatchPipeline,
                baseMatch: stage.issueBaseMatch,
                extraMatch: stage.issueExtraMatch,
              },
            ];

      const doneSources =
        Array.isArray(stage.doneSources) && stage.doneSources.length > 0
          ? stage.doneSources
          : [
              {
                collection: stage.doneCollection,
                dateField: stage.doneDateField,
                qtyExpr: stage.doneQtyExpr,
                preMatchPipeline: stage.donePreMatchPipeline,
                baseMatch: stage.doneBaseMatch,
                extraMatch: stage.doneExtraMatch,
              },
            ];

      const aggregateSourceQty = async (sources = []) => {
        const quantities = await Promise.all(
          sources.map(async (source) => {
            if (!source?.collection || !source?.dateField) return 0;
            const [summary] = await safeAggregate(source.collection, [
              ...(Array.isArray(source.preMatchPipeline) ? source.preMatchPipeline : []),
              {
                $match: combineMatch(
                  dateMatch(source.dateField, fromDate, toDate),
                  source.baseMatch || null,
                  source.extraMatch || null
                ),
              },
              { $group: { _id: null, qty: { $sum: source.qtyExpr || 0 } } },
            ]);
            return Number(summary?.qty || 0);
          })
        );
        return quantities.reduce((total, qty) => total + Number(qty || 0), 0);
      };

      const issuedQty = await aggregateSourceQty(issueSources);
      const doneQty = await aggregateSourceQty(doneSources);
      const yieldRate = issuedQty > 0 ? (doneQty / issuedQty) * 100 : 0;

      return {
        stage: stage.stage,
        unit: stage.unit,
        issuedQty: round2(issuedQty),
        doneQty: round2(doneQty),
        yieldRate: round2(yieldRate),
      };
    })
  );

  return rows;
};


const aggregateDamageWastageByStage = async ({ fromDate, toDate, wastageFilters = {} }) => {
  const contextualMatch = buildWastageContextMatch(wastageFilters);
  const roundQuantityByUnit = (value, unit) => {
    const normalizedUnit = String(unit || '').toUpperCase();
    const precision = ['SQM', 'CMT'].includes(normalizedUnit) ? 3 : 2;
    return Number((Number(value || 0)).toFixed(precision));
  };
  const stageMap = new Map();

  await Promise.all(
    DAMAGE_WASTAGE_STAGES.map(async (stage) => {
      const [damage, issued] = await Promise.all([
        safeAggregate(stage.damageCollection, [
          ...(Array.isArray(stage.damagePreMatchPipeline) ? stage.damagePreMatchPipeline : []),
          {
            $match: combineMatch(
              dateMatch(stage.damageDateField, fromDate, toDate),
              stage.damageBaseMatch || null,
              contextualMatch
            ),
          },
          {
            $group: {
              _id: null,
              qty: { $sum: stage.damageQtyExpr || 0 },
              amount: { $sum: stage.damageAmountExpr || 0 },
            },
          },
        ]).then((rows) => rows?.[0] || {}),
        safeAggregate(stage.issuedCollection, [
          ...(Array.isArray(stage.issuedPreMatchPipeline) ? stage.issuedPreMatchPipeline : []),
          {
            $match: combineMatch(
              dateMatch(stage.issuedDateField, fromDate, toDate),
              stage.issuedBaseMatch || null,
              contextualMatch
            ),
          },
          { $group: { _id: null, qty: { $sum: stage.issuedQtyExpr || 0 } } },
        ]).then((rows) => rows?.[0] || {}),
      ]);

      const stageKey = String(stage.stage || '').toUpperCase();
      if (!stageKey) return;

      if (!stageMap.has(stageKey)) {
        stageMap.set(stageKey, {
          stage: stageKey,
          unit: String(stage.unit || 'units').toUpperCase(),
          wasteQty: 0,
          damageQty: 0,
          issuedQty: 0,
          damageAmount: 0,
        });
      }

      const current = stageMap.get(stageKey);
      const qty = Number(damage?.qty || 0);
      const amount = Number(damage?.amount || 0);
      const metricType = String(stage.metricType || 'DAMAGE').toUpperCase();

      if (metricType === 'WASTAGE') {
        current.wasteQty += qty;
      } else {
        current.damageQty += qty;
      }

      current.damageAmount += amount;
      current.issuedQty = Math.max(current.issuedQty, Number(issued?.qty || 0));
    })
  );

  const rows = [...stageMap.values()].map((row) => {
    const totalLoss = Number(row.wasteQty || 0) + Number(row.damageQty || 0);
    const issuedQty = Number(row.issuedQty || 0);
    const lossRate = issuedQty > 0 ? (totalLoss / issuedQty) * 100 : 0;

    return {
      stage: row.stage,
      unit: row.unit,
      wasteQty: roundQuantityByUnit(row.wasteQty, row.unit),
      damageQty: roundQuantityByUnit(row.damageQty, row.unit),
      issuedQty: roundQuantityByUnit(issuedQty, row.unit),
      damageAmount: round2(row.damageAmount),
      damageRate: round2(lossRate),
      wastePercentage: round2(lossRate),
    };
  });

  const byUnit = [...rows.reduce((map, row) => {
    const key = String(row.unit || 'UNITS').toUpperCase();
    if (!map.has(key)) {
      map.set(key, {
        unit: key,
        wasteQty: 0,
        damageQty: 0,
        issuedQty: 0,
        damageAmount: 0,
      });
    }
    const current = map.get(key);
    current.wasteQty += Number(row.wasteQty || 0);
    current.damageQty += Number(row.damageQty || 0);
    current.issuedQty += Number(row.issuedQty || 0);
    current.damageAmount += Number(row.damageAmount || 0);
    return map;
  }, new Map()).values()].map((row) => {
    const totalLoss = Number(row.wasteQty || 0) + Number(row.damageQty || 0);
    return {
      unit: row.unit,
      wasteQty: roundQuantityByUnit(row.wasteQty, row.unit),
      damageQty: roundQuantityByUnit(row.damageQty, row.unit),
      issuedQty: roundQuantityByUnit(row.issuedQty, row.unit),
      damageAmount: round2(row.damageAmount),
      wastePercentage:
        row.issuedQty > 0 ? round2((totalLoss / Number(row.issuedQty)) * 100) : 0,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.damageQty += Number(row.damageQty || 0);
      acc.wasteQty += Number(row.wasteQty || 0);
      acc.issuedQty += Number(row.issuedQty || 0);
      acc.damageAmount += Number(row.damageAmount || 0);
      return acc;
    },
    { damageQty: 0, wasteQty: 0, issuedQty: 0, damageAmount: 0 }
  );

  return {
    byStage: rows,
    byUnit,
    totals: {
      damageQty: round2(totals.damageQty),
      wasteQty: round2(totals.wasteQty),
      issuedQty: round2(totals.issuedQty),
      damageAmount: round2(totals.damageAmount),
      // Not computed globally because issued and loss units differ across processes.
      damageRate: null,
    },
  };
};


const aggregateWasteTrend = async ({ fromDate, toDate, wastageFilters = {} }) => {
  const contextualMatch = buildWastageContextMatch(wastageFilters);
  const roundQuantityByUnit = (value, unit) => {
    const normalizedUnit = String(unit || '').toUpperCase();
    const precision = ['SQM', 'CMT'].includes(normalizedUnit) ? 3 : 2;
    return Number((Number(value || 0)).toFixed(precision));
  };
  const trendMap = new Map();

  await Promise.all(
    DAMAGE_WASTAGE_STAGES.map(async (stage) => {
      const [damageRows, issuedRows] = await Promise.all([
        safeAggregate(stage.damageCollection, [
          ...(Array.isArray(stage.damagePreMatchPipeline) ? stage.damagePreMatchPipeline : []),
          {
            $match: combineMatch(
              dateMatch(stage.damageDateField, fromDate, toDate),
              stage.damageBaseMatch || null,
              contextualMatch
            ),
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: `$${stage.damageDateField}`,
                },
              },
              wasteQty: { $sum: stage.damageQtyExpr || 0 },
            },
          },
        ]),
        safeAggregate(stage.issuedCollection, [
          ...(Array.isArray(stage.issuedPreMatchPipeline) ? stage.issuedPreMatchPipeline : []),
          {
            $match: combineMatch(
              dateMatch(stage.issuedDateField, fromDate, toDate),
              stage.issuedBaseMatch || null,
              contextualMatch
            ),
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: `$${stage.issuedDateField}`,
                },
              },
              issuedQty: { $sum: stage.issuedQtyExpr || 0 },
            },
          },
        ]),
      ]);

      const dailyMap = new Map();
      damageRows.forEach((row) => {
        const key = row?._id;
        if (!key) return;
        if (!dailyMap.has(key)) {
          dailyMap.set(key, { wasteQty: 0, issuedQty: 0 });
        }
        const current = dailyMap.get(key);
        current.wasteQty += Number(row?.wasteQty || 0);
      });

      issuedRows.forEach((row) => {
        const key = row?._id;
        if (!key) return;
        if (!dailyMap.has(key)) {
          dailyMap.set(key, { wasteQty: 0, issuedQty: 0 });
        }
        const current = dailyMap.get(key);
        current.issuedQty += Number(row?.issuedQty || 0);
      });

      dailyMap.forEach((value, period) => {
        const key = `${period}__${stage.stage}__${stage.unit}`;
        if (!trendMap.has(key)) {
          trendMap.set(key, {
            period,
            stage: stage.stage,
            unit: stage.unit,
            wasteQty: 0,
            issuedQty: 0,
          });
        }
        const current = trendMap.get(key);
        current.wasteQty += Number(value.wasteQty || 0);
        current.issuedQty = Math.max(
          Number(current.issuedQty || 0),
          Number(value.issuedQty || 0)
        );
      });
    })
  );

  return [...trendMap.values()]
    .map((row) => ({
      period: row.period,
      stage: row.stage,
      unit: row.unit,
      wasteQty: roundQuantityByUnit(row.wasteQty, row.unit),
      issuedQty: roundQuantityByUnit(row.issuedQty, row.unit),
      wastePercentage:
        row.issuedQty > 0 ? round2((Number(row.wasteQty) / Number(row.issuedQty)) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.period === b.period) {
        if (a.stage === b.stage) return a.unit.localeCompare(b.unit);
        return a.stage.localeCompare(b.stage);
      }
      return a.period.localeCompare(b.period);
    });
};


const aggregateWipAging = async ({ toDate }) => {
  const bucketMap = new Map(
    WIP_AGING_BUCKETS.map((bucket) => [bucket.label, { bucket: bucket.label, count: 0, amount: 0 }])
  );

  const rows = await Promise.all(
    WIP_STAGES.map((stage) =>
      safeAggregate(stage.collection, [
        {
          $match: {
            ...stage.baseMatch,
            [stage.dateField]: { $lte: toDate },
          },
        },
        {
          $project: {
            amount: stage.amountExpr || 0,
            ageDays: {
              $max: [
                {
                  $floor: {
                    $divide: [
                      { $subtract: [toDate, `$${stage.dateField}`] },
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
            amount: 1,
            bucket: {
              $switch: {
                branches: [
                  { case: { $lte: ['$ageDays', 7] }, then: '0-7' },
                  { case: { $lte: ['$ageDays', 15] }, then: '8-15' },
                  { case: { $lte: ['$ageDays', 30] }, then: '16-30' },
                ],
                default: '31+',
              },
            },
          },
        },
        {
          $group: {
            _id: '$bucket',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ])
    )
  );

  rows.flat().forEach((row) => {
    const key = row?._id;
    if (!bucketMap.has(key)) return;
    const current = bucketMap.get(key);
    current.count += Number(row?.count || 0);
    current.amount += Number(row?.amount || 0);
  });

  return WIP_AGING_BUCKETS.map((bucket) => {
    const row = bucketMap.get(bucket.label);
    return {
      bucket: bucket.label,
      count: Number(row?.count || 0),
      amount: round2(row?.amount || 0),
    };
  });
};


const aggregateFactoryPipeline = ({ wipByStage = [], productionThroughput = [] }) => {
  const stageByName = new Map(
    wipByStage.map((stage) => [String(stage.stage || '').toUpperCase(), stage])
  );
  const throughputByName = new Map(
    productionThroughput.map((stage) => [String(stage.stage || '').toUpperCase(), stage])
  );

  return FACTORY_PIPELINE_STAGES.map((stage) => {
    if (stage.key === 'READY') {
      const readyRow = throughputByName.get('POLISHING');
      return {
        stage: stage.label,
        qty: round2(readyRow?.primaryQty || 0),
        amount: round2(readyRow?.amount || 0),
      };
    }

    const row = stageByName.get(stage.key);
    const qty = Number(row?.qtySheets || 0) || Number(row?.qtySqm || 0) || Number(row?.qtyUnits || 0);
    return {
      stage: stage.label,
      qty: round2(qty),
      amount: round2(row?.amount || 0),
    };
  });
};


const aggregateProductionThroughputTrend = async ({ fromDate, toDate }) => {
  const dailyMap = new Map();

  const rows = await Promise.all(
    THROUGHPUT_STAGES.map((stage) => {
      const qtyExpr = stage.qtySheetsExpr || stage.qtySqmExpr || stage.qtyUnitsExpr || 0;
      return safeAggregate(stage.collection, [
        { $match: dateMatch(stage.dateField, fromDate, toDate) },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: `$${stage.dateField}`,
              },
            },
            amount: { $sum: stage.amountExpr || 0 },
            qty: { $sum: qtyExpr },
          },
        },
      ]);
    })
  );

  rows.forEach((rowSet) => mergeDailyRows(dailyMap, rowSet));
  return sortedDaily(dailyMap).map((row) => ({
    period: row.period,
    qty: row.qty,
    amount: row.amount,
  }));
};


  return {
    aggregateWipByStage,
    aggregateProductionThroughput,
    aggregateYieldByStage,
    aggregateDamageWastageByStage,
    aggregateWasteTrend,
    aggregateWipAging,
    aggregateFactoryPipeline,
    aggregateProductionThroughputTrend,
  };
};
