export const buildFactoryTab = ({ kpis = {}, charts = {}, factorySubModuleCards = [] }) => ({
  kpis: {
    wipValue: kpis.wipValue,
    wipQuantity: kpis.wipQuantity,
    productionOutput: kpis.productionOutput,
    yieldPercent: kpis.yieldPercent,
  },
  subModuleCards: factorySubModuleCards,
  charts: {
    wipFunnel: charts.wipFunnel,
    productionThroughputTrend: charts.productionThroughputTrend,
    yieldByStage: charts.yieldByStage,
    wastageByProcess: charts.wastageByProcess,
    wastageByUnit: charts.wastageByUnit,
    wasteTrend: charts.wasteTrend,
    damagePareto: charts.damagePareto,
  },
});
