export const buildPackingTab = ({ kpis = {}, packingGoodsTypeMetrics = {} }) => ({
  kpis: {
    packingDoneAmount: kpis.packingDoneAmount,
    packingDoneSheets: kpis.packingDoneSheets,
    packingPending: kpis.packingPending,
    packedNotDispatched: kpis.packedNotDispatched,
  },
  tables: {
    goodsTypeSummary: packingGoodsTypeMetrics.summaryByType,
    goodsTypeRows: packingGoodsTypeMetrics.recordsByType,
  },
});
