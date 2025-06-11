export const issues_for_status = {
  crosscutting: 'crosscutting',
  crosscut_done: 'crosscut_done',
  flitching: 'flitching',
  flitching_done: 'flitching_done',
  log: 'log',
  veneer: 'veneer',
  flitch: 'flitch',
  peeling: 'peeling',
  reflitching: 'reflitching',
  slicing: 'slicing',
  slicing_peeling: 'slicing_peeling',
  smoking_dying: 'smoking_dying',
  dressing: 'dressing',
  pressing: 'pressing',
  grouping: 'grouping',
  order: 'order',
  tapping: 'tapping',
  pressing: 'pressing',
  sample: 'sample',
  stock: 'stock',
  challan: 'challan',
  plywood_resizing: 'plywood_resizing',
  face: 'face',
  core: 'core',
  plywood_production: 'plywood_production',
  cnc_factory: 'cnc',
  color_factory: 'color',
};

export const inward_type = {
  inventory: 'inventory',
  job_work: 'job_work',
  challan: 'challan',
};

export const issue_for_peeling = {
  rest_roller: 'rest_roller',
  wastage: 'wastage',
};

export const peeling_done = {
  veneer: 'veneer',
  face: 'face',
  core: 'core',
};
export const issue_for_slicing = {
  balance_flitch: 'balance_flitch',
  wastage: 'wastage',
};

export const slicing_done_from = {
  issue_for_slicing: 'issue_for_slicing',
  re_slicing: 're_slicing',
};

export const dressing_error_types = {
  no_of_leaves_missmatch: 'no_of_leaves_missmatch',
  thickness_missmatch: 'thickness_missmatch',
  process_pending: 'process_pending',
  slicing_not_done: 'slicing_not_done',
  peeling_not_done: 'peeling_not_done',
  dressing_done: 'dressing_done',
  in_complete_data: 'in_complete_data',
};

// order related constants
export const order_status = {
  pending: 'PENDING',
  partial_complete: 'PARTIAL COMPLETE',
  complete: 'COMPLETE',
};
export const order_type = {
  regular: 'REGULAR',
  job_work: 'JOB WORK',
};
export const order_category = {
  raw: 'RAW',
  decorative: 'DECORATIVE',
  series_product: 'SERIES PRODUCT',
};
export const branding_type = {
  with_branding: 'WITH BRANDING',
  without_branding: 'WITHOUT BRANDING',
};

export const order_item_status = {
  cancel: 'CANCEL',
};

export const item_issued_from = {
  log: 'LOG',
  flitch: 'FLITCH',
  veneer: 'VENEER',
  plywood: 'PLYWOOD',
  core: 'CORE',
  fleece_paper: 'FLEECE_PAPER',
  face: 'FACE',
  mdf: 'MDF',
  store: 'OTHER_GOODS',
  other_goods: 'OTHER_GOODS',
  crosscutting: 'CROSSCUTTING',
  flitching_factory: 'FLITCHING_FACTORY',
  dressing_factory: 'DRESSING_FACTORY',
  grouping_factory: 'GROUPING_FACTORY',
  pressing_factory: 'PRESSING_FACTORY',
  cnc_factory: 'CNC',
  canvas_factory: 'CANVAS',
  color_factory: 'COLOR',
  polishing_factory: 'POLISHING',
  bunito_factory: 'BUNITO',
  packing: 'PACKING',
};

export const item_issued_for = {
  order: 'ORDER',
  stock: 'STOCK',
  sample: 'SAMPLE',
};

export const base_type_constants = {
  plywood: 'PLYWOOD',
  fleece_paper: 'FLEECE_PAPER',
  mdf: 'MDF',
};
export const consumed_from_constants = {
  inventory: 'INVENTORY',
  production: 'PRODUCTION',
  resizing: 'RESIZING',
  factory: 'FACTORY',
};

export const challan_status = {
  received: 'RECEIVED',
  not_received: 'NOT RECEIVED',
};

export const transaction_type = {
  regular: 'REGULAR',
  bill_to_ship_to: 'BILL TO SHIP TO',
  bill_from_dispatch_from: 'BILL FORM DISPATCH FROM',
  bill_to_ship_to_and_bill_from_dispatch_from:
    'BILL TO SHIP TO AND BILL FROM DISPATCH FROM',
};
export const customer_supplier_type = {
  b2b: 'B2B',
  b2c: 'B2C',
  sezwp: 'SEZWP',
  sezwop: 'SEZWOP',
  expwp: 'EXPWP',
  expwop: 'EXPWOP',
  dexp: 'DEXP',
  merchant_export: 'MERCHANT EXPORT',
};
export const credit_schedule_type = {
  advance: 'ADVANCE',
  against_dispatch: 'AGAINST DISPATCH',
  '15_days': '15 DAYS',
  '30_days': '30 DAYS',
  '45_days': '45 DAYS',
  '60_days': '60 DAYS',
};

export const transporter_type = {
  part_load: 'PART_LOAD',
  full_load: 'FULL_LOAD',
  both: 'BOTH',
};
export const process_type = {
  pre_pressing: 'PRE_PRESSING',
  post_pressing: 'POST_PRESSING',
};
export const color_type = {
  timber: 'TIMBER',
  pre_pressing: 'PRE_PRESSING',
  post_pressing: 'POST_PRESSING',
};
