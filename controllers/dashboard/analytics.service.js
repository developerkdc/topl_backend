import mongoose from 'mongoose';
import {
  dispatch_status,
  order_status,
} from '../../database/Utils/constants/constants.js';
import { buildTabsPayload } from './tabs/buildTabsPayload.js';
import { createInventoryAggregations } from './aggregations/inventory.aggregations.js';
import { createFactoryAggregations } from './aggregations/factory.aggregations.js';
import { createOrdersAggregations } from './aggregations/orders.aggregations.js';
import { createPackingAggregations } from './aggregations/packing.aggregations.js';
import { createDispatchAggregations } from './aggregations/dispatch.aggregations.js';

const DASHBOARD_MODULES = [
  'ALL',
  'EXECUTIVE',
  'INVENTORY',
  'PRODUCTION',
  'ORDERS',
  'PACKING',
  'DISPATCH',
];

const DEFAULT_RANGE_DAYS = 30;

const ORDER_ITEM_COLLECTIONS = [
  'raw_order_item_details',
  'decorative_order_item_details',
  'series_product_order_item_details',
];

// Keep dashboard inventory aligned with active listing screens (not history views).
const INVENTORY_SOURCES = [
  {
    collection: 'log_inventory_items_details',
    module: 'LOG',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'log_inventory_invoice_details',
    inwardAmountExpr: { $ifNull: ['$amount', 0] },
    amountExpr: { $ifNull: ['$amount', 0] },
    snapshotAmountExpr: { $ifNull: ['$amount', 0] },
    qtyExpr: { $ifNull: ['$physical_cmt', 0] },
    qtyBreakdown: {
      cmt: { $ifNull: ['$physical_cmt', 0] },
    },
    activeMatch: {
      issue_status: { $in: [null, 'log'] },
    },
  },
  {
    collection: 'flitch_inventory_items_details',
    module: 'FLITCH',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'flitch_inventory_invoice_details',
    inwardAmountExpr: { $ifNull: ['$amount', 0] },
    snapshotAmountExpr: { $ifNull: ['$amount', 0] },
    amountExpr: { $ifNull: ['$amount', 0] },
    qtyExpr: { $ifNull: ['$flitch_cmt', 0] },
    qtyBreakdown: {
      cmt: { $ifNull: ['$flitch_cmt', 0] },
    },
    activeMatch: {
      issue_status: { $in: [null, 'flitch'] },
    },
  },
  {
    collection: 'veneer_inventory_items_details',
    module: 'VENEER',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'veneer_inventory_invoice_details',
    inwardAmountExpr: {
      $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }],
    },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: {
      $ifNull: ['$available_sqm', { $ifNull: ['$available_number_of_leaves', 0] }],
    },
    qtyBreakdown: {
      sqm: { $ifNull: ['$available_sqm', 0] },
      leaves: { $ifNull: ['$available_number_of_leaves', 0] },
    },
    activeMatch: {
      issue_status: { $in: [null, 'veneer'] },
    },
  },
  {
    collection: 'plywood_inventory_items_details',
    module: 'PLYWOOD',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'plywood_inventory_invoice_details',
    inwardAmountExpr: {
      $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }],
    },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: { $ifNull: ['$available_sqm', { $ifNull: ['$available_sheets', 0] }] },
    qtyBreakdown: {
      sqm: { $ifNull: ['$available_sqm', 0] },
      sheets: { $ifNull: ['$available_sheets', 0] },
    },
    activeMatch: {
      available_sheets: { $ne: 0 },
    },
  },
  {
    collection: 'mdf_inventory_items_details',
    module: 'MDF',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'mdf_inventory_invoice_details',
    inwardAmountExpr: {
      $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }],
    },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: { $ifNull: ['$available_sqm', { $ifNull: ['$available_sheets', 0] }] },
    qtyBreakdown: {
      sqm: { $ifNull: ['$available_sqm', 0] },
      sheets: { $ifNull: ['$available_sheets', 0] },
    },
    activeMatch: {
      available_sheets: { $ne: 0 },
    },
  },
  {
    collection: 'face_inventory_items_details',
    module: 'FACE',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'face_inventory_invoice_details',
    inwardAmountExpr: {
      $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }],
    },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: { $ifNull: ['$available_sqm', { $ifNull: ['$available_sheets', 0] }] },
    qtyBreakdown: {
      sqm: { $ifNull: ['$available_sqm', 0] },
      sheets: { $ifNull: ['$available_sheets', 0] },
    },
    activeMatch: {
      available_sheets: { $ne: 0 },
    },
  },
  {
    collection: 'core_inventory_items_details',
    module: 'CORE',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'core_inventory_invoice_details',
    inwardAmountExpr: {
      $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }],
    },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: { $ifNull: ['$available_sqm', { $ifNull: ['$available_sheets', 0] }] },
    qtyBreakdown: {
      sqm: { $ifNull: ['$available_sqm', 0] },
      sheets: { $ifNull: ['$available_sheets', 0] },
    },
    activeMatch: {
      available_sqm: { $ne: 0 },
    },
  },
  {
    collection: 'fleece_inventory_items_details',
    module: 'FLEECE',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'fleece_inventory_invoice_details',
    inwardAmountExpr: {
      $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }],
    },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: { $ifNull: ['$available_sqm', { $ifNull: ['$available_number_of_roll', 0] }] },
    qtyBreakdown: {
      sqm: { $ifNull: ['$available_sqm', 0] },
      rolls: { $ifNull: ['$available_number_of_roll', 0] },
    },
    activeMatch: {
      available_sqm: { $ne: 0 },
    },
  },
  {
    collection: 'othergoods_inventory_items_details',
    module: 'OTHER GOODS',
    dateField: 'createdAt',
    ageDateField: 'createdAt',
    invoiceCollection: 'othergoods_inventory_invoice_details',
    inwardAmountExpr: { $ifNull: ['$amount', { $ifNull: ['$available_amount', 0] }] },
    snapshotAmountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    amountExpr: {
      $ifNull: ['$available_amount', { $ifNull: ['$amount', 0] }],
    },
    qtyExpr: { $ifNull: ['$available_quantity', 0] },
    qtyBreakdown: {
      quantity: { $ifNull: ['$available_quantity', 0] },
      units: { $ifNull: ['$available_quantity', 0] },
    },
    activeMatch: {
      available_quantity: { $ne: 0 },
    },
  },
];

const INVENTORY_MODULE_LABELS = {
  LOG: 'Log',
  FLITCH: 'Flitch',
  PLYWOOD: 'Plywood',
  VENEER: 'Veneer',
  MDF: 'MDF',
  FACE: 'Face',
  CORE: 'Core',
  FLEECE: 'Fleece Paper',
  'OTHER GOODS': 'Other Goods',
};

const INVENTORY_QUANTITY_FIELD_LABELS = [
  { key: 'cmt', label: 'CMT' },
  { key: 'sqm', label: 'SQM' },
  { key: 'sheets', label: 'Sheets' },
  { key: 'leaves', label: 'Leaves' },
  { key: 'rolls', label: 'Rolls' },
  { key: 'quantity', label: 'Qty' },
];

const WIP_STAGES = [
  {
    stage: 'CROSSCUTTING',
    collection: 'issues_for_crosscuttings',
    dateField: 'createdAt',
    baseMatch: { crosscutting_completed: false, is_rejected: { $ne: true } },
    amountExpr: { $ifNull: ['$available_quantity.amount', { $ifNull: ['$amount', 0] }] },
    qtyUnitsExpr: {
      $ifNull: ['$available_quantity.physical_cmt', { $ifNull: ['$physical_cmt', 0] }],
    },
  },
  {
    stage: 'FLITCHING',
    collection: 'issues_for_flitchings',
    dateField: 'createdAt',
    baseMatch: { flitching_completed: false },
    amountExpr: { $ifNull: ['$available_quantity.amount', { $ifNull: ['$amount', 0] }] },
    qtyUnitsExpr: { $ifNull: ['$available_quantity.cmt', { $ifNull: ['$cmt', 0] }] },
  },
  {
    stage: 'PEELING',
    collection: 'issues_for_peelings',
    dateField: 'createdAt',
    baseMatch: { is_peeling_done: false },
    amountExpr: { $ifNull: ['$amount', 0] },
    qtyUnitsExpr: { $ifNull: ['$cmt', 0] },
  },
  {
    stage: 'SLICING',
    collection: 'issued_for_slicings',
    dateField: 'createdAt',
    baseMatch: { is_slicing_completed: false },
    amountExpr: { $ifNull: ['$amount', 0] },
    qtyUnitsExpr: { $ifNull: ['$cmt', 0] },
  },
  {
    stage: 'GROUPING',
    collection: 'issues_for_groupings',
    dateField: 'createdAt',
    baseMatch: { is_grouping_done: false },
    amountExpr: { $ifNull: ['$amount', 0] },
    qtySqmExpr: { $ifNull: ['$sqm', 0] },
    qtyUnitsExpr: { $ifNull: ['$no_of_leaves', 0] },
  },
  {
    stage: 'TAPPING',
    collection: 'issue_for_tappings',
    dateField: 'createdAt',
    baseMatch: { is_tapping_done: false },
    amountExpr: { $ifNull: ['$amount', 0] },
    qtySheetsExpr: { $ifNull: ['$no_of_sheets', 0] },
    qtySqmExpr: { $ifNull: ['$sqm', 0] },
  },
  {
    stage: 'PRESSING',
    collection: 'issues_for_pressings',
    dateField: 'createdAt',
    baseMatch: { is_pressing_done: false },
    amountExpr: { $ifNull: ['$available_details.amount', { $ifNull: ['$amount', 0] }] },
    qtySheetsExpr: {
      $ifNull: ['$available_details.no_of_sheets', { $ifNull: ['$no_of_sheets', 0] }],
    },
    qtySqmExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
  },
  {
    stage: 'POLISHING',
    collection: 'issued_for_polishing_details',
    dateField: 'createdAt',
    baseMatch: { is_polishing_done: false },
    amountExpr: { $ifNull: ['$available_details.amount', { $ifNull: ['$issued_amount', 0] }] },
    qtySheetsExpr: {
      $ifNull: ['$available_details.no_of_sheets', { $ifNull: ['$issued_sheets', 0] }],
    },
    qtySqmExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$issued_sqm', 0] }] },
  },
];

const THROUGHPUT_STAGES = [
  {
    stage: 'CROSSCUTTING',
    collection: 'crosscutting_dones',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$cost_amount', 0] },
    qtyUnitsExpr: { $ifNull: ['$crosscut_cmt', 0] },
  },
  {
    stage: 'FLITCHING',
    collection: 'flitchings',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$cost_amount', 0] },
    qtyUnitsExpr: { $ifNull: ['$flitch_cmt', 0] },
  },
  {
    stage: 'PEELING',
    collection: 'peeling_done_items',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$item_total_amount', { $ifNull: ['$item_amount', 0] }] },
    qtyUnitsExpr: { $ifNull: ['$no_of_leaves', 0] },
  },
  {
    stage: 'SLICING',
    collection: 'slicing_done_items',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$amount', 0] },
    qtyUnitsExpr: { $ifNull: ['$no_of_leaves', 0] },
  },
  {
    stage: 'GROUPING',
    collection: 'grouping_done_items_details',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$available_details.amount', { $ifNull: ['$amount', 0] }] },
    qtySheetsExpr: {
      $ifNull: ['$available_details.no_of_sheets', { $ifNull: ['$no_of_sheets', 0] }],
    },
    qtySqmExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
  },
  {
    stage: 'TAPPING',
    collection: 'tapping_done_items_details',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$available_details.amount', { $ifNull: ['$amount', 0] }] },
    qtySheetsExpr: {
      $ifNull: ['$available_details.no_of_sheets', { $ifNull: ['$no_of_sheets', 0] }],
    },
    qtySqmExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
  },
  {
    stage: 'PRESSING',
    collection: 'pressing_done_details',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$available_details.amount', { $ifNull: ['$amount', 0] }] },
    qtySheetsExpr: {
      $ifNull: ['$available_details.no_of_sheets', { $ifNull: ['$no_of_sheets', 0] }],
    },
    qtySqmExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
  },
  {
    stage: 'POLISHING',
    collection: 'polishing_done_details',
    dateField: 'createdAt',
    amountExpr: { $ifNull: ['$available_details.amount', { $ifNull: ['$amount', 0] }] },
    qtySheetsExpr: {
      $ifNull: ['$available_details.no_of_sheets', { $ifNull: ['$no_of_sheets', 0] }],
    },
    qtySqmExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
  },
];

const YIELD_STAGES = [
  {
    stage: 'CROSSCUTTING',
    issueCollection: 'issues_for_crosscuttings',
    issueDateField: 'createdAt',
    issuedQtyExpr: {
      $ifNull: ['$available_quantity.physical_cmt', { $ifNull: ['$physical_cmt', 0] }],
    },
    doneCollection: 'crosscutting_dones',
    doneDateField: 'createdAt',
    doneQtyExpr: { $ifNull: ['$crosscut_cmt', 0] },
    unit: 'cmt',
  },
  {
    stage: 'FLITCHING',
    issueCollection: 'issues_for_flitchings',
    issueDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$available_quantity.cmt', { $ifNull: ['$cmt', 0] }] },
    doneCollection: 'flitchings',
    doneDateField: 'createdAt',
    doneQtyExpr: { $ifNull: ['$flitch_cmt', 0] },
    unit: 'cmt',
  },
  {
    stage: 'GROUPING',
    issueCollection: 'issues_for_groupings',
    issueDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$sqm', 0] },
    doneCollection: 'grouping_done_items_details',
    doneDateField: 'createdAt',
    doneQtyExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
    unit: 'sqm',
  },
  {
    stage: 'TAPPING',
    issueCollection: 'issue_for_tappings',
    issueDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$sqm', 0] },
    doneCollection: 'tapping_done_items_details',
    doneDateField: 'createdAt',
    doneQtyExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
    unit: 'sqm',
  },
  {
    stage: 'PRESSING',
    issueCollection: 'issues_for_pressings',
    issueDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
    doneCollection: 'pressing_done_details',
    doneDateField: 'createdAt',
    doneQtyExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
    unit: 'sqm',
  },
  {
    stage: 'POLISHING',
    issueCollection: 'issued_for_polishing_details',
    issueDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$issued_sqm', 0] },
    doneCollection: 'polishing_done_details',
    doneDateField: 'createdAt',
    doneQtyExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
    unit: 'sqm',
  },
];

const DAMAGE_WASTAGE_STAGES = [
  {
    stage: 'PEELING',
    metricType: 'WASTAGE',
    damageCollection: 'issues_for_peeling_wastage',
    damageDateField: 'createdAt',
    damageQtyExpr: { $ifNull: ['$cmt', 0] },
    damageAmountExpr: {
      $ifNull: ['$total_wastage_amount', { $ifNull: ['$wastage_consumed_amount', 0] }],
    },
    issuedCollection: 'issues_for_peelings',
    issuedDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$cmt', 0] },
    unit: 'cmt',
  },
  {
    stage: 'SLICING',
    metricType: 'WASTAGE',
    damageCollection: 'issue_for_slicing_wastage',
    damageDateField: 'createdAt',
    damageQtyExpr: { $ifNull: ['$cmt', 0] },
    damageAmountExpr: {
      $ifNull: ['$total_wastage_amount', { $ifNull: ['$wastage_consumed_amount', 0] }],
    },
    issuedCollection: 'issued_for_slicings',
    issuedDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$cmt', 0] },
    unit: 'cmt',
  },
  {
    stage: 'TAPPING',
    metricType: 'WASTAGE',
    damageCollection: 'issue_for_tapping_wastages',
    damageDateField: 'createdAt',
    damageQtyExpr: { $ifNull: ['$sqm', 0] },
    damageAmountExpr: { $ifNull: ['$amount', 0] },
    issuedCollection: 'issue_for_tappings',
    issuedDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$sqm', 0] },
    unit: 'sqm',
  },
  {
    stage: 'PRESSING',
    metricType: 'DAMAGE',
    damageCollection: 'pressing_damage',
    damageDateField: 'createdAt',
    damageQtyExpr: { $ifNull: ['$sqm', 0] },
    damageAmountExpr: { $ifNull: ['$amount', 0] },
    issuedCollection: 'issues_for_pressings',
    issuedDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$available_details.sqm', { $ifNull: ['$sqm', 0] }] },
    unit: 'sqm',
  },
  {
    stage: 'POLISHING',
    metricType: 'DAMAGE',
    damageCollection: 'polishing_damage_details',
    damageDateField: 'createdAt',
    damageQtyExpr: { $ifNull: ['$sqm', 0] },
    damageAmountExpr: { $ifNull: ['$amount', 0] },
    issuedCollection: 'issued_for_polishing_details',
    issuedDateField: 'createdAt',
    issuedQtyExpr: { $ifNull: ['$issued_sqm', 0] },
    unit: 'sqm',
  },
];

const WIP_AGING_BUCKETS = [
  { label: '0-7', min: 0, max: 7 },
  { label: '8-15', min: 8, max: 15 },
  { label: '16-30', min: 16, max: 30 },
  { label: '31+', min: 31, max: null },
];

const INVENTORY_AGING_BUCKETS = [
  { label: '0-30', min: 0, max: 30 },
  { label: '31-60', min: 31, max: 60 },
  { label: '61-90', min: 61, max: 90 },
  { label: '90+', min: 91, max: null },
];

const FACTORY_PIPELINE_STAGES = [
  { label: 'Crosscut', key: 'CROSSCUTTING' },
  { label: 'Flitching', key: 'FLITCHING' },
  { label: 'Slicing', key: 'SLICING' },
  { label: 'Polishing', key: 'POLISHING' },
  { label: 'Ready', key: 'READY' },
];

const FACTORY_STAGE_ORDER = [
  ...new Set([
    ...WIP_STAGES.map((stage) => stage.stage),
    ...THROUGHPUT_STAGES.map((stage) => stage.stage),
    ...YIELD_STAGES.map((stage) => stage.stage),
    ...DAMAGE_WASTAGE_STAGES.map((stage) => stage.stage),
  ]),
];

const FACTORY_SUBMODULE_CARD_SPECS = [
  { key: 'CROSSCUTTING', label: 'Crosscutting', sourceStage: 'CROSSCUTTING' },
  { key: 'FLITCHING', label: 'Flitching', sourceStage: 'FLITCHING' },
  { key: 'PEELING', label: 'Peeling', sourceStage: 'PEELING' },
  { key: 'SLICING', label: 'Slicing', sourceStage: 'SLICING' },
  { key: 'GROUPING', label: 'Grouping', sourceStage: 'GROUPING' },
  { key: 'TAPPING', label: 'Tapping', sourceStage: 'TAPPING' },
  { key: 'PRESSING', label: 'Pressing', sourceStage: 'PRESSING' },
  { key: 'POLISHING', label: 'Polishing', sourceStage: 'POLISHING' },
  { key: 'CNC', label: 'CNC', sourceStage: 'CNC' },
  { key: 'COLOUR', label: 'Colour', sourceStage: 'COLOUR' },
  { key: 'BUNITO', label: 'Bunito', sourceStage: 'BUNITO' },
  { key: 'CANVAS', label: 'Canvas', sourceStage: 'CANVAS' },
  { key: 'DRESSING', label: 'Dressing', sourceStage: 'DRESSING' },
  { key: 'RESIZING', label: 'Resizing', sourceStage: 'RESIZING' },
  { key: 'SMOKING_DYING', label: 'Smoking Dying', sourceStage: 'SMOKING_DYING' },
  {
    key: 'PLYWOOD_PRODUCTION',
    label: 'Plywood Production',
    sourceStage: 'PLYWOOD_PRODUCTION',
  },
];

const ORDER_CATEGORY_SOURCES = [
  {
    collection: 'raw_order_item_details',
    category: 'RAW',
    qtyExpr: {
      $ifNull: ['$no_of_sheets', { $ifNull: ['$no_of_sheet', 0] }],
    },
    amountExpr: { $ifNull: ['$amount', 0] },
  },
  {
    collection: 'decorative_order_item_details',
    category: 'DECORATIVE',
    qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
    amountExpr: { $ifNull: ['$amount', 0] },
  },
  {
    collection: 'series_product_order_item_details',
    category: 'SERIES PRODUCT',
    qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
    amountExpr: { $ifNull: ['$amount', 0] },
  },
];

const ORDER_TABLE_SOURCES = [
  {
    key: 'RAW',
    label: 'Raw',
    collection: 'raw_order_item_details',
    defaultCategory: 'RAW',
    qtyExpr: {
      $ifNull: ['$no_of_sheets', { $ifNull: ['$no_of_sheet', 0] }],
    },
  },
  {
    key: 'DECORATIVE',
    label: 'Decorative',
    collection: 'decorative_order_item_details',
    defaultCategory: 'DECORATIVE',
    qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
  },
  {
    key: 'SERIES',
    label: 'Series',
    collection: 'series_product_order_item_details',
    defaultCategory: 'SERIES PRODUCT',
    qtyExpr: { $ifNull: ['$no_of_sheets', 0] },
  },
];

const SUPPLIER_SOURCES = [
  {
    module: 'LOG',
    invoiceCollection: 'log_inventory_invoice_details',
    itemCollection: 'log_inventory_items_details',
  },
  {
    module: 'FLITCH',
    invoiceCollection: 'flitch_inventory_invoice_details',
    itemCollection: 'flitch_inventory_items_details',
  },
  {
    module: 'VENEER',
    invoiceCollection: 'veneer_inventory_invoice_details',
    itemCollection: 'veneer_inventory_items_details',
  },
  {
    module: 'PLYWOOD',
    invoiceCollection: 'plywood_inventory_invoice_details',
    itemCollection: 'plywood_inventory_items_details',
  },
  {
    module: 'MDF',
    invoiceCollection: 'mdf_inventory_invoice_details',
    itemCollection: 'mdf_inventory_items_details',
  },
  {
    module: 'FACE',
    invoiceCollection: 'face_inventory_invoice_details',
    itemCollection: 'face_inventory_items_details',
  },
  {
    module: 'CORE',
    invoiceCollection: 'core_inventory_invoice_details',
    itemCollection: 'core_inventory_items_details',
  },
  {
    module: 'FLEECE',
    invoiceCollection: 'fleece_inventory_invoice_details',
    itemCollection: 'fleece_inventory_items_details',
  },
  {
    module: 'OTHER GOODS',
    invoiceCollection: 'othergoods_inventory_invoice_details',
    itemCollection: 'othergoods_inventory_items_details',
  },
];

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const formatStageLabel = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayStart = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dayEnd = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const monthStart = (value) => {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const monthKeyFromDate = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const endOfMonthFromKey = (monthKey) => {
  const [yearValue, monthValue] = String(monthKey || '').split('-');
  const year = Number(yearValue || 0);
  const month = Number(monthValue || 0);
  if (!year || !month) return null;
  return dayEnd(new Date(year, month, 0));
};

const buildMonthKeys = (fromDate, toDate) => {
  const start = monthStart(fromDate);
  const end = monthStart(toDate);
  const keys = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    keys.push(monthKeyFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
};

const buildYearMonthKeys = (year) => {
  const keys = [];
  for (let month = 1; month <= 12; month += 1) {
    keys.push(`${year}-${`${month}`.padStart(2, '0')}`);
  }
  return keys;
};

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatMonthLabel = (monthKey) => {
  const [yearValue, monthValue] = String(monthKey || '').split('-');
  const year = Number(yearValue || 0);
  const month = Number(monthValue || 0);
  if (!year || !month || month < 1 || month > 12) {
    return String(monthKey || '');
  }
  return MONTH_SHORT_NAMES[month - 1];
};

const resolveRange = (query) => {
  const queryFrom = asDate(query?.from);
  const queryTo = asDate(query?.to);
  const toDate = queryTo ? dayEnd(queryTo) : dayEnd(new Date());
  const fallbackFrom = new Date(toDate);
  fallbackFrom.setDate(fallbackFrom.getDate() - (DEFAULT_RANGE_DAYS - 1));
  const fromDate = queryFrom ? dayStart(queryFrom) : dayStart(fallbackFrom);
  return { fromDate, toDate };
};

const resolveMonthRange = (toDate) => ({
  fromDate: monthStart(toDate),
  toDate: dayEnd(toDate),
});

const resolvePreviousMonthRange = (toDate) => {
  const current = dayEnd(toDate);
  const previousMonthLastDate = dayEnd(new Date(current.getFullYear(), current.getMonth(), 0));
  const previousMonthFirstDate = dayStart(
    new Date(previousMonthLastDate.getFullYear(), previousMonthLastDate.getMonth(), 1)
  );
  return {
    fromDate: previousMonthFirstDate,
    toDate: previousMonthLastDate,
  };
};

const normalizeTextFilter = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
};

const resolveDashboardFilters = (query) => ({
  itemName: normalizeTextFilter(query?.itemName),
  series: normalizeTextFilter(query?.series),
  grade: normalizeTextFilter(query?.grade),
  supplier: normalizeTextFilter(query?.supplier),
  customer: normalizeTextFilter(query?.customer),
  processStage: normalizeTextFilter(query?.processStage),
  inventorySubModule: normalizeTextFilter(query?.inventorySubModule),
});

const calculatePercentChange = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : null;
  }
  return round2(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
};

const collectUniqueOptions = (values = [], limit = 50) =>
  [...new Set(values.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);

const filterInventorySources = (inventorySubModule = null) => {
  if (!inventorySubModule) return INVENTORY_SOURCES;
  const filteredSources = INVENTORY_SOURCES.filter(
    (source) => String(source.module || '').toUpperCase() === inventorySubModule
  );
  return filteredSources.length ? filteredSources : INVENTORY_SOURCES;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildStringFieldFilter = (value, fields = []) => {
  if (!value || !fields.length) return null;
  const regex = new RegExp(`^${escapeRegex(value)}$`, 'i');
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: regex },
    })),
  };
};

const buildContainsStringFieldFilter = (value, fields = []) => {
  if (!value || !fields.length) return null;
  const regex = new RegExp(escapeRegex(value), 'i');
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: regex },
    })),
  };
};

const combineMatch = (...conditions) => {
  const validConditions = conditions.filter(
    (condition) => condition && Object.keys(condition).length > 0
  );
  if (validConditions.length === 0) return {};
  if (validConditions.length === 1) return validConditions[0];
  return { $and: validConditions };
};

const normalizeOrderPriorityLabel = (value) => {
  if (value === null || value === undefined) return 'Third';

  if (typeof value === 'number') {
    if (value <= 1) return 'High Priority';
    if (value === 2) return 'First';
    if (value === 3) return 'Secod';
    return 'Third';
  }

  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return 'Third';

  if (
    ['HIGH', 'HIGH PRIORITY', 'URGENT', 'P1', '1', 'TOP'].includes(normalized)
  ) {
    return 'High Priority';
  }
  if (['FIRST', 'P2', '2'].includes(normalized)) return 'First';
  if (['SECOND', 'SECOND', 'SECOD', 'P3', '3'].includes(normalized)) return 'Secod';
  if (['THIRD', 'P4', '4', 'LOW', 'NORMAL'].includes(normalized)) return 'Third';

  return 'Third';
};

const buildWastageContextMatch = (filters = {}) =>
  combineMatch(
    buildStringFieldFilter(filters.itemName, [
      'item_name',
      'sales_item_name',
      'item_details.item_name',
      'item_sub_category_name',
      'item_name.item_name',
    ]),
    buildStringFieldFilter(filters.series, [
      'series_name',
      'series_code',
      'series_product_code',
      'product_code',
      'series_name.series_name',
    ]),
    buildStringFieldFilter(filters.grade, ['grade', 'grade_name', 'grades_name'])
  );

const buildInventoryContextMatch = (filters = {}) =>
  combineMatch(
    buildStringFieldFilter(filters.itemName, [
      'item_name',
      'sales_item_name',
      'item_name.item_name',
      'item_details.item_name',
      'item_sub_category_name',
      'product_category',
      'raw_material',
    ]),
    buildStringFieldFilter(filters.series, [
      'series_name',
      'series_code',
      'series_product_code',
      'product_code',
      'series_name.series_name',
    ]),
    buildStringFieldFilter(filters.grade, [
      'grade',
      'grade_name',
      'grades_name',
      'grade_id.grade_name',
    ])
  );

const buildInventorySourceSupplierMatches = async ({
  sources = INVENTORY_SOURCES,
  supplier = null,
}) => {
  const matches = new Map();
  if (!supplier) return matches;

  const supplierFilterForInvoice = buildContainsStringFieldFilter(supplier, [
    'supplier_details.company_details.supplier_name',
    'supplier_details.supplier_name',
    'supplier_name',
  ]);

  await Promise.all(
    sources.map(async (source) => {
      const supplierSource = SUPPLIER_SOURCES.find(
        (row) => row.itemCollection === source.collection
      );

      if (!supplierSource) {
        matches.set(source.collection, null);
        return;
      }

      const invoiceRows = await safeAggregate(supplierSource.invoiceCollection, [
        { $match: supplierFilterForInvoice || {} },
        { $project: { _id: 1 } },
      ]);

      const invoiceIds = invoiceRows.map((row) => row?._id).filter(Boolean);
      matches.set(source.collection, { invoice_id: { $in: invoiceIds } });
    })
  );

  return matches;
};

const dateMatch = (field, fromDate, toDate) => ({
  [field]: { $gte: fromDate, $lte: toDate },
});

const safeAggregate = async (collectionName, pipeline) => {
  if (!mongoose.connection?.db) return [];
  try {
    return await mongoose.connection.db
      .collection(collectionName)
      .aggregate(pipeline)
      .toArray();
  } catch (error) {
    if (error?.code === 26) return [];
    throw error;
  }
};

const mergeMonthlyRows = (targetMap, rows, amountKey = 'amount', qtyKey = 'qty') => {
  rows.forEach((row) => {
    const key = row?._id;
    if (!key) return;
    if (!targetMap.has(key)) {
      targetMap.set(key, { period: key, amount: 0, qty: 0, count: 0 });
    }
    const current = targetMap.get(key);
    current.amount += Number(row?.[amountKey] || 0);
    current.qty += Number(row?.[qtyKey] || 0);
    current.count += Number(row?.count || 0);
  });
};

const sortedMonthly = (monthlyMap) =>
  [...monthlyMap.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => ({
      period: row.period,
      amount: round2(row.amount),
      qty: round2(row.qty),
      count: row.count,
    }));

const sortedDaily = (dailyMap) =>
  [...dailyMap.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => ({
      period: row.period,
      amount: round2(row.amount),
      qty: round2(row.qty),
      packed: round2(row.packed),
      dispatched: round2(row.dispatched),
      count: row.count,
    }));

const mergeDailyRows = (
  targetMap,
  rows,
  amountKey = 'amount',
  qtyKey = 'qty',
  countKey = 'count'
) => {
  rows.forEach((row) => {
    const key = row?._id;
    if (!key) return;
    if (!targetMap.has(key)) {
      targetMap.set(key, {
        period: key,
        amount: 0,
        qty: 0,
        packed: 0,
        dispatched: 0,
        count: 0,
      });
    }
    const current = targetMap.get(key);
    current.amount += Number(row?.[amountKey] || 0);
    current.qty += Number(row?.[qtyKey] || 0);
    current.count += Number(row?.[countKey] || 0);
  });
};

const aggregateDistinctStrings = async ({
  collection,
  field,
  match = {},
  unwind = false,
  limit = 50,
}) => {
  const pipeline = [];
  if (match && Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }
  pipeline.push({
    $project: {
      value: `$${field}`,
    },
  });
  if (unwind) {
    pipeline.push({
      $unwind: {
        path: '$value',
        preserveNullAndEmptyArrays: false,
      },
    });
  }
  pipeline.push({
    $match: {
      value: {
        $type: 'string',
        $ne: '',
      },
    },
  });
  pipeline.push({
    $group: {
      _id: {
        $trim: { input: { $toUpper: '$value' } },
      },
    },
  });
  pipeline.push({ $sort: { _id: 1 } });
  pipeline.push({ $limit: limit });

  const rows = await safeAggregate(collection, pipeline);
  return rows.map((row) => row?._id).filter(Boolean);
};

const aggregateSlicerOptions = async ({ topSuppliers, topCustomers, topItems }) => {
  const [
    itemNames,
    seriesNames,
    seriesFromOrders,
    gradeNames,
    supplierNames,
    customerNames,
    photoNumbers,
  ] =
    await Promise.all([
      aggregateDistinctStrings({
        collection: 'item_names',
        field: 'item_name',
        limit: 75,
      }),
      aggregateDistinctStrings({
        collection: 'series_masters',
        field: 'series_name',
        limit: 75,
      }),
      aggregateDistinctStrings({
        collection: 'decorative_order_item_details',
        field: 'series_name',
        limit: 75,
      }),
      aggregateDistinctStrings({
        collection: 'grades',
        field: 'grade_name',
        limit: 50,
      }),
      aggregateDistinctStrings({
        collection: 'suppliers',
        field: 'supplier_name',
        limit: 75,
      }),
      aggregateDistinctStrings({
        collection: 'customers',
        field: 'company_name',
        limit: 75,
      }),
      aggregateDistinctStrings({
        collection: 'photos',
        field: 'photo_number',
        limit: 200,
      }),
    ]);

  return {
    items: collectUniqueOptions([
      ...itemNames,
      ...(topItems || []).map((row) => row.label),
    ]),
    inventorySubModules: collectUniqueOptions(
      INVENTORY_SOURCES.map((source) => source.module)
    ),
    series: collectUniqueOptions([...seriesNames, ...seriesFromOrders]),
    grades: collectUniqueOptions(gradeNames),
    suppliers: collectUniqueOptions([
      ...supplierNames,
      ...(topSuppliers || []).map((row) => row.label),
    ]),
    customers: collectUniqueOptions([
      ...customerNames,
      ...(topCustomers || []).map((row) => row.label),
    ]),
    photoNos: collectUniqueOptions(photoNumbers, 200),
  };
};

const aggregationContext = {
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
};

const {
  aggregateInventoryTotals,
  aggregateInventoryInwardValue,
  aggregateInventoryMetrics,
  aggregateInventorySubModuleCards,
  aggregateTopSuppliers,
  aggregateInventoryAging,
  aggregateDeadStockValue,
  aggregateTopInventoryItems,
  aggregateLowStockItems,
  aggregateActiveSkus,
} = createInventoryAggregations(aggregationContext);

const {
  aggregateWipByStage,
  aggregateProductionThroughput,
  aggregateYieldByStage,
  aggregateDamageWastageByStage,
  aggregateWasteTrend,
  aggregateWipAging,
  aggregateFactoryPipeline,
  aggregateProductionThroughputTrend,
} = createFactoryAggregations(aggregationContext);

const {
  aggregateOrderFlowTables,
  aggregateOrderMetrics,
  aggregateAllocationMetrics,
  aggregateOrderDispatchCycle,
  aggregateOrdersByCategory,
  aggregateApprovedOrderSummary,
} = createOrdersAggregations(aggregationContext);

const {
  aggregatePackingMetrics,
  aggregatePackingGoodsTypeMetrics,
} = createPackingAggregations(aggregationContext);

const {
  aggregateDispatchSummary,
  aggregateDispatchMetrics,
  aggregateTopCustomers,
  aggregateDispatchStatus,
  aggregateDispatchRevenueTrend,
  aggregatePackedVsDispatchedTrend,
  aggregateDispatchLifecycleStatus,
  aggregateDispatchDocumentSummary,
} = createDispatchAggregations(aggregationContext);

const normalizeModule = (moduleName) => {
  const value = String(moduleName || 'ALL').toUpperCase().trim();
  return DASHBOARD_MODULES.includes(value) ? value : 'ALL';
};

export const fetchDashboardAnalyticsData = async (query = {}) => {
  const { fromDate, toDate } = resolveRange(query);
  const { fromDate: monthFromDate, toDate: monthToDate } = resolveMonthRange(toDate);
  const previousMonthRange = resolvePreviousMonthRange(toDate);
  const moduleFilter = normalizeModule(query?.module);
  const dashboardFilters = resolveDashboardFilters(query);
  const inventorySources = filterInventorySources(dashboardFilters.inventorySubModule);

  const includeInventory = ['ALL', 'EXECUTIVE', 'INVENTORY'].includes(moduleFilter);
  const includeProduction = ['ALL', 'EXECUTIVE', 'PRODUCTION'].includes(moduleFilter);
  const includeOrders = ['ALL', 'EXECUTIVE', 'ORDERS'].includes(moduleFilter);
  const includePacking = ['ALL', 'EXECUTIVE', 'PACKING'].includes(moduleFilter);
  const includeDispatch = ['ALL', 'EXECUTIVE', 'DISPATCH'].includes(moduleFilter);
  const wastageFilters = {
    itemName: dashboardFilters.itemName,
    series: dashboardFilters.series,
    grade: dashboardFilters.grade,
  };
  const inventorySupplierMatches = includeInventory
    ? await buildInventorySourceSupplierMatches({
        sources: inventorySources,
        supplier: dashboardFilters.supplier,
      })
    : new Map();
  const allInventorySupplierMatches = includeInventory
    ? await buildInventorySourceSupplierMatches({
        sources: INVENTORY_SOURCES,
        supplier: dashboardFilters.supplier,
      })
    : new Map();

  const emptyInventoryTotals = {
    amount: 0,
    sqm: 0,
    sheets: 0,
    leaves: 0,
    rolls: 0,
    cmt: 0,
    quantity: 0,
    units: 0,
  };
  const emptyOrderMetrics = {
    ordersBooked: 0,
    openOrdersCount: 0,
    totals: {
      orderedQty: 0,
      orderedSqm: 0,
      orderedAmount: 0,
      openQty: 0,
      openAmount: 0,
    },
    trend: [],
  };
  const emptyAllocation = { allocatedQty: 0, allocatedSqm: 0, allocatedAmount: 0 };
  const emptyPacking = {
    qtySheets: 0,
    qtySqm: 0,
    amount: 0,
    pending: 0,
    packedNotDispatched: 0,
  };
  const emptyDispatch = {
    revenue: 0,
    qtySheets: 0,
    qtySqm: 0,
    qtyCmt: 0,
    itemSeriesMix: [],
  };

  const [
    inventory,
    inventorySubModuleCards,
    inventoryMonthToDateInwardValue,
    orders,
    ordersMonthToDate,
    allocation,
    packing,
    packingGoodsTypeMetrics,
    dispatch,
    dispatchMonthToDate,
    dispatchDocSummary,
    orderToDispatchCycle,
    wipByStage,
    productionThroughput,
    productionThroughputTrend,
    yieldByStage,
    damageWastage,
    wasteTrend,
    wipAging,
    inventoryAging,
    topCustomers,
    topSuppliers,
    topInventoryItems,
    ordersByCategory,
    orderTables,
    approvedOrders,
    dispatchRevenueTrend,
    packedVsDispatched,
    dispatchLifecycleBreakdown,
    dispatchStatusBreakdown,
    lowStockItems,
    activeSkus,
    deadStockValue,
    previousInventory,
    previousInventoryMonthToDateInwardValue,
    previousOrders,
    previousOrdersMonthToDate,
    previousAllocation,
    previousPacking,
    previousDispatch,
    previousDispatchMonthToDate,
    previousDispatchDocSummary,
    previousWipByStage,
    previousProductionThroughput,
    previousYieldByStage,
    previousLowStockItems,
    previousActiveSkus,
    previousDeadStockValue,
  ] = await Promise.all([
    includeInventory
      ? aggregateInventoryMetrics({
          fromDate,
          toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve({
          totals: emptyInventoryTotals,
          trend: [],
        }),
    includeInventory
      ? aggregateInventorySubModuleCards({
          fromDate,
          toDate,
          sources: INVENTORY_SOURCES,
          filters: dashboardFilters,
          supplierMatches: allInventorySupplierMatches,
        })
      : Promise.resolve([]),
    includeInventory
      ? aggregateInventoryInwardValue({
          fromDate: monthFromDate,
          toDate: monthToDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeOrders ? aggregateOrderMetrics({ fromDate, toDate }) : Promise.resolve(emptyOrderMetrics),
    includeOrders
      ? aggregateOrderMetrics({ fromDate: monthFromDate, toDate: monthToDate })
      : Promise.resolve(emptyOrderMetrics),
    includeOrders ? aggregateAllocationMetrics({ fromDate, toDate }) : Promise.resolve(emptyAllocation),
    includePacking ? aggregatePackingMetrics({ fromDate, toDate }) : Promise.resolve(emptyPacking),
    includePacking
      ? aggregatePackingGoodsTypeMetrics({ fromDate, toDate })
      : Promise.resolve({
          summaryByType: {
            'FINISHED GOODS': {
              goodsType: 'FINISHED GOODS',
              packings: 0,
              noOfSheets: 0,
              sqm: 0,
              quantity: 0,
              amount: 0,
            },
            'RAW GOODS': {
              goodsType: 'RAW GOODS',
              packings: 0,
              noOfSheets: 0,
              sqm: 0,
              quantity: 0,
              amount: 0,
            },
          },
          recordsByType: { 'FINISHED GOODS': [], 'RAW GOODS': [] },
        }),
    includeDispatch
      ? aggregateDispatchMetrics({ fromDate, toDate })
      : Promise.resolve(emptyDispatch),
    includeDispatch
      ? aggregateDispatchSummary({ fromDate: monthFromDate, toDate: monthToDate })
      : Promise.resolve({ revenue: 0, qtySheets: 0, qtySqm: 0, qtyCmt: 0 }),
    includeDispatch
      ? aggregateDispatchDocumentSummary({ fromDate, toDate })
      : Promise.resolve({ count: 0, value: 0 }),
    includeOrders && includeDispatch
      ? aggregateOrderDispatchCycle({ fromDate, toDate })
      : Promise.resolve({ avgDays: 0, samples: 0 }),
    includeProduction ? aggregateWipByStage({ fromDate, toDate }) : Promise.resolve([]),
    includeProduction
      ? aggregateProductionThroughput({ fromDate, toDate })
      : Promise.resolve([]),
    includeProduction
      ? aggregateProductionThroughputTrend({ fromDate, toDate })
      : Promise.resolve([]),
    includeProduction ? aggregateYieldByStage({ fromDate, toDate }) : Promise.resolve([]),
    includeProduction
      ? aggregateDamageWastageByStage({ fromDate, toDate, wastageFilters })
      : Promise.resolve({
          byStage: [],
          byUnit: [],
          totals: { damageQty: 0, issuedQty: 0, damageAmount: 0, damageRate: null },
        }),
    includeProduction
      ? aggregateWasteTrend({ fromDate, toDate, wastageFilters })
      : Promise.resolve([]),
    includeProduction ? aggregateWipAging({ toDate }) : Promise.resolve([]),
    includeInventory
      ? aggregateInventoryAging({
          toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve([]),
    includeDispatch ? aggregateTopCustomers({ fromDate, toDate }) : Promise.resolve([]),
    includeInventory
      ? aggregateTopSuppliers({
          fromDate,
          toDate,
          inventorySubModule: dashboardFilters.inventorySubModule,
          filters: dashboardFilters,
        })
      : Promise.resolve([]),
    includeInventory
      ? aggregateTopInventoryItems({
          fromDate,
          toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve([]),
    includeOrders ? aggregateOrdersByCategory({ fromDate, toDate }) : Promise.resolve([]),
    includeOrders
      ? aggregateOrderFlowTables({ fromDate, toDate, filters: dashboardFilters })
      : Promise.resolve({ orderFlowByType: { RAW: [], DECORATIVE: [], SERIES: [] }, scheduleTable: [] }),
    includeOrders
      ? aggregateApprovedOrderSummary({ fromDate, toDate })
      : Promise.resolve({ total: 0, approved: 0 }),
    includeDispatch ? aggregateDispatchRevenueTrend({ fromDate, toDate }) : Promise.resolve([]),
    includeDispatch ? aggregatePackedVsDispatchedTrend({ fromDate, toDate }) : Promise.resolve([]),
    includeDispatch ? aggregateDispatchLifecycleStatus({ fromDate, toDate }) : Promise.resolve([]),
    includeDispatch ? aggregateDispatchStatus({ fromDate, toDate }) : Promise.resolve([]),
    includeInventory
      ? aggregateLowStockItems({
          toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeInventory
      ? aggregateActiveSkus({
          toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeInventory
      ? aggregateDeadStockValue({
          toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeInventory
      ? aggregateInventoryMetrics({
          ...previousMonthRange,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve({ totals: emptyInventoryTotals, trend: [] }),
    includeInventory
      ? aggregateInventoryInwardValue({
          ...previousMonthRange,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeOrders
      ? aggregateOrderMetrics(previousMonthRange)
      : Promise.resolve(emptyOrderMetrics),
    includeOrders
      ? aggregateOrderMetrics(previousMonthRange)
      : Promise.resolve(emptyOrderMetrics),
    includeOrders
      ? aggregateAllocationMetrics(previousMonthRange)
      : Promise.resolve(emptyAllocation),
    includePacking
      ? aggregatePackingMetrics(previousMonthRange)
      : Promise.resolve(emptyPacking),
    includeDispatch
      ? aggregateDispatchMetrics(previousMonthRange)
      : Promise.resolve(emptyDispatch),
    includeDispatch
      ? aggregateDispatchSummary(previousMonthRange)
      : Promise.resolve({ revenue: 0, qtySheets: 0, qtySqm: 0, qtyCmt: 0 }),
    includeDispatch
      ? aggregateDispatchDocumentSummary(previousMonthRange)
      : Promise.resolve({ count: 0, value: 0 }),
    includeProduction ? aggregateWipByStage(previousMonthRange) : Promise.resolve([]),
    includeProduction
      ? aggregateProductionThroughput(previousMonthRange)
      : Promise.resolve([]),
    includeProduction ? aggregateYieldByStage(previousMonthRange) : Promise.resolve([]),
    includeInventory
      ? aggregateLowStockItems({
          toDate: previousMonthRange.toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeInventory
      ? aggregateActiveSkus({
          toDate: previousMonthRange.toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
    includeInventory
      ? aggregateDeadStockValue({
          toDate: previousMonthRange.toDate,
          sources: inventorySources,
          filters: dashboardFilters,
          supplierMatches: inventorySupplierMatches,
        })
      : Promise.resolve(0),
  ]);

  const matchesFilter = (value, filter) => {
    if (!filter) return true;
    return String(value || '').toUpperCase().includes(filter);
  };

  const selectedProcessStage = dashboardFilters.processStage;
  const stageFilter = (row) =>
    !selectedProcessStage || String(row?.stage || '').toUpperCase() === selectedProcessStage;

  const filteredWipByStage = wipByStage.filter(stageFilter);
  const filteredPreviousWipByStage = previousWipByStage.filter(stageFilter);
  const filteredProductionThroughput = productionThroughput.filter(stageFilter);
  const filteredPreviousProductionThroughput = previousProductionThroughput.filter(stageFilter);
  const filteredYieldByStage = yieldByStage.filter(stageFilter);
  const filteredPreviousYieldByStage = previousYieldByStage.filter(stageFilter);
  const filteredDamageByStage = damageWastage.byStage.filter(stageFilter);
  const filteredWasteTrendRows = wasteTrend.filter(stageFilter);

  const filteredTopSuppliers = topSuppliers.filter((row) =>
    matchesFilter(row?.label, dashboardFilters.supplier)
  );
  const filteredTopCustomers = topCustomers.filter((row) =>
    matchesFilter(row?.label, dashboardFilters.customer)
  );
  const filteredTopInventoryItems = topInventoryItems.filter((row) =>
    matchesFilter(row?.label, dashboardFilters.itemName)
  );

  const issueByStage = new Map();
  filteredYieldByStage.forEach((row) => {
    const stage = String(row?.stage || '').toUpperCase();
    if (!stage) return;
    issueByStage.set(stage, Number(row?.issuedQty || 0));
  });
  filteredDamageByStage.forEach((row) => {
    const stage = String(row?.stage || '').toUpperCase();
    if (!stage) return;
    const existing = Number(issueByStage.get(stage) || 0);
    if (existing > 0) return;
    issueByStage.set(stage, Number(row?.issuedQty || 0));
  });

  const completeByStage = new Map();
  filteredYieldByStage.forEach((row) => {
    const stage = String(row?.stage || '').toUpperCase();
    if (!stage) return;
    completeByStage.set(stage, Number(row?.doneQty || 0));
  });
  filteredProductionThroughput.forEach((row) => {
    const stage = String(row?.stage || '').toUpperCase();
    if (!stage) return;
    const existing = Number(completeByStage.get(stage) || 0);
    if (existing > 0) return;
    completeByStage.set(stage, Number(row?.primaryQty || 0));
  });

  const damageByStage = new Map();
  filteredDamageByStage.forEach((row) => {
    const stage = String(row?.stage || '').toUpperCase();
    if (!stage) return;
    damageByStage.set(stage, Number(row?.damageQty || row?.wasteQty || 0));
  });

  const normalizedProcessStage = String(dashboardFilters.processStage || '').toUpperCase();
  const factorySubModuleCards = FACTORY_SUBMODULE_CARD_SPECS.filter((spec) => {
    if (!normalizedProcessStage) return true;
    return (
      String(spec.key || '').toUpperCase() === normalizedProcessStage ||
      String(spec.sourceStage || '').toUpperCase() === normalizedProcessStage
    );
  }).map((spec) => {
    const stageKey = String(spec.sourceStage || spec.key || '').toUpperCase();
    return {
      module: spec.key,
      label: spec.label || formatStageLabel(spec.key),
      issue: round2(issueByStage.get(stageKey) || 0),
      complete: round2(completeByStage.get(stageKey) || 0),
      damage: round2(damageByStage.get(stageKey) || 0),
    };
  });

  const wipTotals = filteredWipByStage.reduce(
    (acc, row) => {
      acc.amount += Number(row.amount || 0);
      acc.qtySheets += Number(row.qtySheets || 0);
      acc.qtySqm += Number(row.qtySqm || 0);
      acc.qtyUnits += Number(row.qtyUnits || 0);
      return acc;
    },
    { amount: 0, qtySheets: 0, qtySqm: 0, qtyUnits: 0 }
  );

  const previousWipTotals = filteredPreviousWipByStage.reduce(
    (acc, row) => {
      acc.amount += Number(row.amount || 0);
      acc.qtySheets += Number(row.qtySheets || 0);
      acc.qtySqm += Number(row.qtySqm || 0);
      acc.qtyUnits += Number(row.qtyUnits || 0);
      return acc;
    },
    { amount: 0, qtySheets: 0, qtySqm: 0, qtyUnits: 0 }
  );

  const allocationRate =
    orders.totals.orderedQty > 0
      ? (allocation.allocatedQty / orders.totals.orderedQty) * 100
      : 0;

  const previousAllocationRate =
    previousOrders.totals.orderedQty > 0
      ? (previousAllocation.allocatedQty / previousOrders.totals.orderedQty) * 100
      : 0;

  const avgOrderValue =
    orders.ordersBooked > 0 ? orders.totals.orderedAmount / orders.ordersBooked : 0;

  const previousAvgOrderValue =
    previousOrders.ordersBooked > 0
      ? previousOrders.totals.orderedAmount / previousOrders.ordersBooked
      : 0;

  const orderFulfillmentRate =
    orders.totals.orderedQty > 0
      ? (dispatch.qtySheets / orders.totals.orderedQty) * 100
      : 0;

  const totalProductionThroughputQty = filteredProductionThroughput.reduce(
    (acc, row) => acc + Number(row.primaryQty || 0),
    0
  );

  const previousProductionThroughputQty = filteredPreviousProductionThroughput.reduce(
    (acc, row) => acc + Number(row.primaryQty || 0),
    0
  );

  const yieldTotals = filteredYieldByStage.reduce(
    (acc, row) => {
      acc.issuedQty += Number(row.issuedQty || 0);
      acc.doneQty += Number(row.doneQty || 0);
      return acc;
    },
    { issuedQty: 0, doneQty: 0 }
  );

  const previousYieldTotals = filteredPreviousYieldByStage.reduce(
    (acc, row) => {
      acc.issuedQty += Number(row.issuedQty || 0);
      acc.doneQty += Number(row.doneQty || 0);
      return acc;
    },
    { issuedQty: 0, doneQty: 0 }
  );

  const yieldPercent =
    yieldTotals.issuedQty > 0 ? (yieldTotals.doneQty / yieldTotals.issuedQty) * 100 : 0;
  const previousYieldPercent =
    previousYieldTotals.issuedQty > 0
      ? (previousYieldTotals.doneQty / previousYieldTotals.issuedQty) * 100
      : 0;

  const approvedRatio =
    approvedOrders.total > 0 ? approvedOrders.approved / approvedOrders.total : 0;
  const approvedQty = orders.totals.orderedQty * approvedRatio;
  const approvedAmount = orders.totals.orderedAmount * approvedRatio;

  const fulfillmentFunnel = [
    {
      stage: 'ORDERED',
      qtySheets: round2(orders.totals.orderedQty),
      qtySqm: round2(orders.totals.orderedSqm),
      amount: round2(orders.totals.orderedAmount),
    },
    {
      stage: 'APPROVED',
      qtySheets: round2(approvedQty),
      qtySqm: round2(orders.totals.orderedSqm * approvedRatio),
      amount: round2(approvedAmount),
    },
    {
      stage: 'ISSUED',
      qtySheets: round2(allocation.allocatedQty),
      qtySqm: round2(allocation.allocatedSqm),
      amount: round2(allocation.allocatedAmount),
    },
    {
      stage: 'PACKED',
      qtySheets: round2(packing.qtySheets),
      qtySqm: round2(packing.qtySqm),
      amount: round2(packing.amount),
    },
    {
      stage: 'DISPATCHED',
      qtySheets: round2(dispatch.qtySheets),
      qtySqm: round2(dispatch.qtySqm),
      amount: round2(dispatch.revenue),
    },
  ];

  const dispatchRate =
    packing.qtySheets > 0 ? (dispatch.qtySheets / packing.qtySheets) * 100 : 0;
  const previousDispatchRate =
    previousPacking.qtySheets > 0
      ? (previousDispatch.qtySheets / previousPacking.qtySheets) * 100
      : 0;

  const avgDispatchValue =
    dispatchDocSummary.count > 0 ? dispatchDocSummary.value / dispatchDocSummary.count : 0;
  const previousAvgDispatchValue =
    previousDispatchDocSummary.count > 0
      ? previousDispatchDocSummary.value / previousDispatchDocSummary.count
      : 0;

  const inventoryTrend = (inventory.trend || []).map((row) => ({
    month: row.month || row.period,
    monthLabel: row.monthLabel || formatMonthLabel(row.month || row.period),
    period: row.month || row.period,
    inwardValue: round2(row.inwardValue || 0),
    inventoryValue: round2(row.inventoryValue || 0),
  }));

  const inventoryQuantityByUnit = [
    { unit: 'CMT', quantity: round2(inventory.totals.cmt || 0) },
    { unit: 'SQM', quantity: round2(inventory.totals.sqm || 0) },
    { unit: 'SHEETS', quantity: round2(inventory.totals.sheets || 0) },
    { unit: 'LEAVES', quantity: round2(inventory.totals.leaves || 0) },
    { unit: 'ROLLS', quantity: round2(inventory.totals.rolls || 0) },
    {
      unit: 'QUANTITY',
      quantity: round2(inventory.totals.quantity || inventory.totals.units || 0),
    },
  ].map((row) => ({
    ...row,
    value: row.quantity,
  }));

  const wipFunnel = aggregateFactoryPipeline({
    wipByStage: filteredWipByStage,
    productionThroughput: filteredProductionThroughput,
  });

  const damagePareto = [...filteredDamageByStage].sort(
    (a, b) => Number(b.damageAmount || 0) - Number(a.damageAmount || 0)
  );

  const toUnitLabel = (unit) => String(unit || 'units').toUpperCase();

  const damageByStageRows = filteredDamageByStage.reduce((map, row) => {
    const stageKey = String(row?.stage || '').toUpperCase();
    if (!stageKey) return map;

    if (!map.has(stageKey)) {
      map.set(stageKey, {
        stage: stageKey,
        unit: toUnitLabel(row?.unit),
        wasteQty: 0,
        damageQty: 0,
        issuedQty: 0,
        damageAmount: 0,
      });
    }

    const current = map.get(stageKey);
    current.wasteQty += Number(row?.wasteQty || 0);
    current.damageQty += Number(row?.damageQty || 0);
    current.issuedQty = Math.max(current.issuedQty, Number(row?.issuedQty || 0));
    current.damageAmount += Number(row?.damageAmount || 0);

    if (!current.unit || current.unit === 'UNITS') {
      current.unit = toUnitLabel(row?.unit);
    }

    return map;
  }, new Map());

  const wastageByProcess = FACTORY_SUBMODULE_CARD_SPECS.map((spec) => {
    const stageKey = String(spec.sourceStage || spec.key || '').toUpperCase();
    const row = damageByStageRows.get(stageKey);
    const wasteQty = round2(row?.wasteQty || 0);
    const damageQty = round2(row?.damageQty || 0);
    const issuedQty = round2(row?.issuedQty || 0);
    const unitLabel = row?.unit || '--';
    const totalLoss = Number(wasteQty || 0) + Number(damageQty || 0);
    const lossPercentage = issuedQty > 0 ? round2((totalLoss / issuedQty) * 100) : 0;
    const stageLabel = spec.label || formatStageLabel(stageKey);

    return {
      stage: stageKey,
      process: stageLabel,
      unit: unitLabel,
      wasteQty,
      damageQty,
      issuedQty,
      damageAmount: round2(row?.damageAmount || 0),
      wastePercentage: lossPercentage,
      label: `${stageLabel} - ${lossPercentage}% (${unitLabel})`,
    };
  });


  const wastageByUnit = [...filteredDamageByStage.reduce((map, row) => {
    const unit = toUnitLabel(row?.unit);
    if (!map.has(unit)) {
      map.set(unit, {
        unit,
        wasteQty: 0,
        issuedQty: 0,
        damageAmount: 0,
      });
    }
    const current = map.get(unit);
    current.wasteQty += Number(row?.wasteQty || row?.damageQty || 0);
    current.issuedQty += Number(row?.issuedQty || 0);
    current.damageAmount += Number(row?.damageAmount || 0);
    return map;
  }, new Map()).values()]
    .map((row) => ({
      unit: row.unit,
      wasteQty: round2(row.wasteQty),
      issuedQty: round2(row.issuedQty),
      damageAmount: round2(row.damageAmount),
      wastePercentage: row.issuedQty > 0 ? round2((row.wasteQty / row.issuedQty) * 100) : 0,
    }))
    .sort((a, b) => {
      if (Number(b.wastePercentage || 0) === Number(a.wastePercentage || 0)) {
        return Number(b.wasteQty || 0) - Number(a.wasteQty || 0);
      }
      return Number(b.wastePercentage || 0) - Number(a.wastePercentage || 0);
    });

  const wasteTrendByUnit = [...filteredWasteTrendRows.reduce((map, row) => {
    const period = row?.period;
    if (!period) return map;
    const unit = toUnitLabel(row?.unit);
    const key = `${period}__${unit}`;
    if (!map.has(key)) {
      map.set(key, {
        period,
        unit,
        wasteQty: 0,
        issuedQty: 0,
      });
    }
    const current = map.get(key);
    current.wasteQty += Number(row?.wasteQty || 0);
    current.issuedQty += Number(row?.issuedQty || 0);
    return map;
  }, new Map()).values()]
    .map((row) => ({
      period: row.period,
      unit: row.unit,
      wasteQty: round2(row.wasteQty),
      issuedQty: round2(row.issuedQty),
      wastePercentage: row.issuedQty > 0 ? round2((row.wasteQty / row.issuedQty) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.period === b.period) return a.unit.localeCompare(b.unit);
      return a.period.localeCompare(b.period);
    });

  const kpis = {
    totalInventoryValue: round2(inventory.totals.amount),
    inventoryQtyBreakdown: inventory.totals,
    lowStockItems: Number(lowStockItems || 0),
    activeSkus: Number(activeSkus || 0),
    deadStockValue: round2(deadStockValue || 0),
    wipValue: round2(wipTotals.amount),
    wipQuantity: round2(wipTotals.qtySheets + wipTotals.qtySqm + wipTotals.qtyUnits),
    wipQtyByStageSheets: round2(wipTotals.qtySheets),
    wipQtyByStageSqm: round2(wipTotals.qtySqm),
    inwardThisMonth: round2(inventoryMonthToDateInwardValue),
    inwardThisMonthValue: round2(inventoryMonthToDateInwardValue),
    productionOutput: round2(totalProductionThroughputQty),
    yieldPercent: round2(yieldPercent),
    ordersBooked: orders.ordersBooked,
    ordersBookedMtd: Number(ordersMonthToDate.ordersBooked || 0),
    totalOrderValue: round2(orders.totals.orderedAmount),
    ordersBookedAmount: round2(orders.totals.orderedAmount),
    openOrdersCount: Number(orders.openOrdersCount || 0),
    openOrdersQty: round2(orders.totals.openQty),
    openOrdersAmount: round2(orders.totals.openAmount),
    openOrderValue: round2(orders.totals.openAmount),
    allocationRate: round2(allocationRate),
    packingDoneAmount: round2(packing.amount),
    packingDoneSheets: round2(packing.qtySheets),
    packingPending: packing.pending,
    packedNotDispatched: packing.packedNotDispatched,
    dispatchRevenue: round2(dispatch.revenue),
    dispatchRevenueMtd: round2(dispatchMonthToDate.revenue),
    dispatchQuantity: round2(dispatchMonthToDate.qtySheets),
    dispatchRate: round2(dispatchRate),
    avgDispatchValue: round2(avgDispatchValue),
    dispatchQtySheets: round2(dispatch.qtySheets),
    dispatchQtySqm: round2(dispatch.qtySqm),
    dispatchQtyCmt: round2(dispatch.qtyCmt),
    dispatchQtySheetsMtd: round2(dispatchMonthToDate.qtySheets),
    dispatchQtySqmMtd: round2(dispatchMonthToDate.qtySqm),
    dispatchQtyCmtMtd: round2(dispatchMonthToDate.qtyCmt),
    avgOrderValue: round2(avgOrderValue),
    orderFulfillmentRate: round2(orderFulfillmentRate),
    orderToDispatchCycleDays: round2(orderToDispatchCycle.avgDays),
    orderToDispatchSamples: Number(orderToDispatchCycle.samples || 0),
    productionThroughputQty: round2(totalProductionThroughputQty),
    damageWastageAmount: round2(damageWastage.totals.damageAmount),
  };

  const previousKpis = {
    totalInventoryValue: round2(previousInventory.totals.amount),
    lowStockItems: Number(previousLowStockItems || 0),
    activeSkus: Number(previousActiveSkus || 0),
    deadStockValue: round2(previousDeadStockValue || 0),
    inwardThisMonthValue: round2(previousInventoryMonthToDateInwardValue),
    wipValue: round2(previousWipTotals.amount),
    wipQuantity: round2(
      previousWipTotals.qtySheets + previousWipTotals.qtySqm + previousWipTotals.qtyUnits
    ),
    productionOutput: round2(previousProductionThroughputQty),
    yieldPercent: round2(previousYieldPercent),
    ordersBookedMtd: Number(previousOrdersMonthToDate.ordersBooked || 0),
    totalOrderValue: round2(previousOrders.totals.orderedAmount),
    openOrderValue: round2(previousOrders.totals.openAmount),
    allocationRate: round2(previousAllocationRate),
    avgOrderValue: round2(previousAvgOrderValue),
    dispatchRevenueMtd: round2(previousDispatchMonthToDate.revenue),
    dispatchQuantity: round2(previousDispatchMonthToDate.qtySheets),
    packedNotDispatched: Number(previousPacking.packedNotDispatched || 0),
    dispatchRate: round2(previousDispatchRate),
    avgDispatchValue: round2(previousAvgDispatchValue),
  };

  const kpiChanges = {
    totalInventoryValue: calculatePercentChange(
      kpis.totalInventoryValue,
      previousKpis.totalInventoryValue
    ),
    inwardThisMonthValue: calculatePercentChange(
      kpis.inwardThisMonthValue,
      previousKpis.inwardThisMonthValue
    ),
    lowStockItems: calculatePercentChange(kpis.lowStockItems, previousKpis.lowStockItems),
    activeSkus: calculatePercentChange(kpis.activeSkus, previousKpis.activeSkus),
    deadStockValue: calculatePercentChange(kpis.deadStockValue, previousKpis.deadStockValue),
    wipValue: calculatePercentChange(kpis.wipValue, previousKpis.wipValue),
    wipQuantity: calculatePercentChange(kpis.wipQuantity, previousKpis.wipQuantity),
    productionOutput: calculatePercentChange(
      kpis.productionOutput,
      previousKpis.productionOutput
    ),
    yieldPercent: calculatePercentChange(kpis.yieldPercent, previousKpis.yieldPercent),
    ordersBookedMtd: calculatePercentChange(
      kpis.ordersBookedMtd,
      previousKpis.ordersBookedMtd
    ),
    totalOrderValue: calculatePercentChange(
      kpis.totalOrderValue,
      previousKpis.totalOrderValue
    ),
    openOrderValue: calculatePercentChange(
      kpis.openOrderValue,
      previousKpis.openOrderValue
    ),
    allocationRate: calculatePercentChange(kpis.allocationRate, previousKpis.allocationRate),
    avgOrderValue: calculatePercentChange(kpis.avgOrderValue, previousKpis.avgOrderValue),
    dispatchRevenueMtd: calculatePercentChange(
      kpis.dispatchRevenueMtd,
      previousKpis.dispatchRevenueMtd
    ),
    dispatchQuantity: calculatePercentChange(
      kpis.dispatchQuantity,
      previousKpis.dispatchQuantity
    ),
    packedNotDispatched: calculatePercentChange(
      kpis.packedNotDispatched,
      previousKpis.packedNotDispatched
    ),
    dispatchRate: calculatePercentChange(kpis.dispatchRate, previousKpis.dispatchRate),
    avgDispatchValue: calculatePercentChange(
      kpis.avgDispatchValue,
      previousKpis.avgDispatchValue
    ),
  };

  const processStages = [
    ...new Set([
      ...WIP_STAGES.map((stage) => stage.stage),
      ...THROUGHPUT_STAGES.map((stage) => stage.stage),
    ]),
  ];

  const slicerOptions = await aggregateSlicerOptions({
    topSuppliers: filteredTopSuppliers,
    topCustomers: filteredTopCustomers,
    topItems: filteredTopInventoryItems,
  });

  const charts = {
    inventoryTrend,
    inventoryQuantityByUnit,
    stockAging: inventoryAging,
    topSuppliers: filteredTopSuppliers,
    topInventoryItems: filteredTopInventoryItems,
    wipFunnel,
    productionThroughputTrend,
    yieldByStage: filteredYieldByStage,
    wastageByProcess,
    wastageByUnit,
    wasteTrend: wasteTrendByUnit,
    damagePareto,
    orderBookingTrend: orders.trend,
    orderFulfillmentFunnel: fulfillmentFunnel,
    ordersByCategory,
    dispatchRevenueTrend,
    packedVsDispatched,
    dispatchStatusBreakdown: dispatchLifecycleBreakdown,
    topCustomers: filteredTopCustomers,
    itemSeriesMix: dispatch.itemSeriesMix,
    wipByStage: filteredWipByStage,
    productionThroughput: filteredProductionThroughput,
    damageWastageByStage: filteredDamageByStage,
    wipAging,
    fulfillmentFunnel,
    legacyDispatchStatus: dispatchStatusBreakdown,
  };

  const tabs = buildTabsPayload({
    kpis,
    charts,
    inventorySubModuleCards,
    factorySubModuleCards,
    orderTables,
    packingGoodsTypeMetrics,
  });

  return {
    status: 'success',
    result: {
      filters: {
        from: fromDate,
        to: toDate,
        module: moduleFilter,
        ...dashboardFilters,
      },
      kpis,
      kpiChanges,
      charts,
      tabs,
      slicers: {
        modules: DASHBOARD_MODULES,
        processStages: collectUniqueOptions(processStages),
        items: slicerOptions.items,
        inventorySubModules: slicerOptions.inventorySubModules,
        series: slicerOptions.series,
        grades: slicerOptions.grades,
        suppliers: slicerOptions.suppliers,
        customers: slicerOptions.customers,
        photoNos: slicerOptions.photoNos,
        statuses: {
          orderStatus: Object.values(order_status),
          dispatchStatus: ['PENDING', 'IN TRANSIT', 'DELIVERED'],
        },
      },
      generatedAt: new Date(),
    },
  };
};
