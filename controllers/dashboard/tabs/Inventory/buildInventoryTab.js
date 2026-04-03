export const buildInventoryTab = ({ kpis = {}, charts = {}, inventorySubModuleCards = [] }) => ({
  kpis: {
    totalInventoryValue: kpis.totalInventoryValue,
    inwardThisMonthValue: kpis.inwardThisMonthValue,
    lowStockItems: kpis.lowStockItems,
    activeSkus: kpis.activeSkus,
    deadStockValue: kpis.deadStockValue,
  },
  subModuleCards: inventorySubModuleCards,
  charts: {
    inventoryTrend: charts.inventoryTrend,
    inventoryQuantityByUnit: charts.inventoryQuantityByUnit,
    stockAging: charts.stockAging,
    topSuppliers: charts.topSuppliers,
    topInventoryItems: charts.topInventoryItems,
  },
});
