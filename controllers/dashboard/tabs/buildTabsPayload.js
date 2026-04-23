import { buildInventoryTab } from './Inventory/buildInventoryTab.js';
import { buildFactoryTab } from './Factory/buildFactoryTab.js';
import { buildOrdersTab } from './Orders/buildOrdersTab.js';
import { buildPackingTab } from './Packing/buildPackingTab.js';
import { buildDispatchTab } from './Dispatch/buildDispatchTab.js';

export const buildTabsPayload = ({
  kpis = {},
  charts = {},
  inventorySubModuleCards = [],
  factorySubModuleCards = [],
  orderTables = {},
  packingGoodsTypeMetrics = {},
}) => ({
  INVENTORY: buildInventoryTab({
    kpis,
    charts,
    inventorySubModuleCards,
  }),
  PRODUCTION: buildFactoryTab({
    kpis,
    charts,
    factorySubModuleCards,
  }),
  ORDERS: buildOrdersTab({
    kpis,
    charts,
    orderTables,
  }),
  PACKING: buildPackingTab({
    kpis,
    packingGoodsTypeMetrics,
  }),
  DISPATCH: buildDispatchTab({
    kpis,
    charts,
    packingGoodsTypeMetrics,
  }),
});
