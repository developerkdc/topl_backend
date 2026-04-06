export const buildOrdersTab = ({ kpis = {}, charts = {}, orderTables = {} }) => ({
  kpis: {
    ordersBookedMtd: kpis.ordersBookedMtd,
    totalOrderValue: kpis.totalOrderValue,
    openOrderValue: kpis.openOrderValue,
    allocationRate: kpis.allocationRate,
    avgOrderValue: kpis.avgOrderValue,
  },
  charts: {
    orderBookingTrend: charts.orderBookingTrend,
    orderFulfillmentFunnel: charts.orderFulfillmentFunnel,
    ordersByCategory: charts.ordersByCategory,
  },
  tables: {
    orderFlowByType: orderTables.orderFlowByType,
    scheduleTable: orderTables.scheduleTable,
  },
  scheduling: {
    scheduleTable: orderTables.scheduleTable,
  },
});
