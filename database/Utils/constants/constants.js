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
  sample: 'sample',
  stock: 'stock',
  challan: 'challan',
  face:'face',
  core:'core'
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
  crosscutting: 'CROSSCUTTING',
  flitching_factory: 'FLITCHING_FACTORY',
  dressing_factory: 'DRESSING_FACTORY',
};
