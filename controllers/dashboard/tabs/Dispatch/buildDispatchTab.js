export const buildDispatchTab = ({
  kpis = {},
  charts = {},
  packingGoodsTypeMetrics = {},
}) => ({
  kpis: {
    dispatchRevenueMtd: kpis.dispatchRevenueMtd,
    dispatchQuantity: kpis.dispatchQuantity,
    packedNotDispatched: kpis.packedNotDispatched,
    dispatchRate: kpis.dispatchRate,
    avgDispatchValue: kpis.avgDispatchValue,
  },
  charts: {
    dispatchRevenueTrend: charts.dispatchRevenueTrend,
    packedVsDispatched: charts.packedVsDispatched,
    dispatchStatusBreakdown: charts.dispatchStatusBreakdown,
    topCustomers: charts.topCustomers,
  },
  tables: {
    packingDoneRowsByType: packingGoodsTypeMetrics.recordsByType || {
      'FINISHED GOODS': [],
      'RAW GOODS': [],
    },
  },
});
