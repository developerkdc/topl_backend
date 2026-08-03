import mongoose, { model } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { format_date, StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import {
  peeling_done_items_model,
  peeling_done_other_details_model,
} from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import {
  slicing_done_items_model,
  slicing_done_other_details_model,
} from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import '../../../database/schema/masters/item.subcategory.schema.js';
import '../../../database/schema/masters/itemName.schema.js';
import '../../../database/schema/masters/colors.js';
import '../../../database/schema/masters/character.schema.js';
import '../../../database/schema/masters/pattern.schema.js';
import '../../../database/schema/masters/series.schema.js';
import '../../../database/schema/masters/grade.schema.js';

const FACTORY_BULK_UPLOAD_BATCH_SIZE = 3000;
const ENABLED_FACTORY_BULK_UPLOADS = new Set(['dressing']);

const FACTORY_NAME_ALIASES = {
  cross_cutting: 'crosscutting',
  'cross-cutting': 'crosscutting',
  smokingdying: 'smoking_dying',
  smoking_dying_done: 'smoking_dying',
  plywood_resizing: 'resizing',
  plywood_resizing_factory: 'resizing',
  'plywood-resizing': 'resizing',
  plywoodproduction: 'plywood_production',
  'plywood-production': 'plywood_production',
  colour: 'color',
};

const BULK_LINK_HEADERS = ['bulk_upload_key'];

const dressing_other_details_fields = [
  'dressing_sr_no',
  'slicing_done_other_details_id',
  'peeling_done_other_details_id',
  'dressing_date',
  'shift',
  'no_of_workers',
  'no_of_working_hours',
  'no_of_total_hours',
  'remark',
];

const factory_config_model = {
  dressing: {
    kind: 'custom_dressing',
    other_details_model: 'dressing_done_other_details',
    item_model: 'dressing_done_items',
    other_details_fields: dressing_other_details_fields,
    fields: [
      'dressing_sr_no',
      'log_no_code',
      'item_name',
      'item_sub_category_name',
      'pallet_number',
      'bundle_number',
      'length',
      'width',
      'thickness',
      'no_of_leaves',
      'sqm',
      'volume',
      'amount',
      'color_name',
      'character_name',
      'pattern_name',
      'series_name',
      'grade_name',
      'amount_factor',
      'expense_amount',
      'remark',
    ],
    other_details_sheet_names: ['Other Details', 'Dressing Details'],
    filepath: '/bulk_uploads/factory/dressing/',
    handler: add_dressing_details,
    success_message: 'dressing items',
  },
  crosscutting: {
    kind: 'single',
    model_name: 'crosscutting_done',
    sheet_names: ['Crosscutting', 'Crosscutting Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/crosscutting/',
    success_message: 'crosscutting records',
    schema_imports: [
      '../../../database/schema/factory/crossCutting/crosscutting.schema.js',
    ],
  },
  flitching: {
    kind: 'single',
    model_name: 'flitching',
    sheet_names: ['Flitching', 'Flitching Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/flitching/',
    success_message: 'flitching records',
    schema_imports: [
      '../../../database/schema/factory/flitching/flitching.schema.js',
    ],
  },
  peeling: {
    kind: 'parent_child',
    parent_model_name: 'peeling_done_other_details',
    parent_sheet_names: ['Other Details', 'Peeling Details'],
    child_sheets: [
      {
        model_name: 'peeling_done_items',
        sheet_names: ['Item Details', 'Peeling Items', 'Peeling Item Details'],
        foreign_key: 'peeling_done_other_details_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'peeling_sr_no'],
    filepath: '/bulk_uploads/factory/peeling/',
    success_message: 'peeling items',
    schema_imports: [
      '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js',
    ],
  },
  slicing: {
    kind: 'parent_child',
    parent_model_name: 'slicing_done_other_details',
    parent_sheet_names: ['Other Details', 'Slicing Details'],
    child_sheets: [
      {
        model_name: 'slicing_done_items',
        sheet_names: ['Item Details', 'Slicing Items', 'Slicing Item Details'],
        foreign_key: 'slicing_done_other_details_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'slicing_sr_no'],
    filepath: '/bulk_uploads/factory/slicing/',
    success_message: 'slicing items',
    schema_imports: [
      '../../../database/schema/factory/slicing/slicing_done.schema.js',
    ],
  },
  smoking_dying: {
    kind: 'parent_child',
    parent_model_name: 'process_done_details',
    parent_sheet_names: [
      'Other Details',
      'Process Details',
      'Smoking Dying Details',
    ],
    child_sheets: [
      {
        model_name: 'process_done_items_details',
        sheet_names: [
          'Item Details',
          'Process Items',
          'Smoking Dying Items',
          'Process Item Details',
        ],
        foreign_key: 'process_done_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'smoking_dying_sr_no', 'process_sr_no'],
    filepath: '/bulk_uploads/factory/smoking_dying/',
    success_message: 'smoking dying items',
    schema_imports: [
      '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js',
    ],
  },
  grouping: {
    kind: 'parent_child',
    parent_model_name: 'grouping_done_details',
    parent_sheet_names: ['Other Details', 'Grouping Details'],
    child_sheets: [
      {
        model_name: 'grouping_done_items_details',
        sheet_names: ['Item Details', 'Grouping Items', 'Grouping Item Details'],
        foreign_key: 'grouping_done_other_details_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'grouping_sr_no'],
    filepath: '/bulk_uploads/factory/grouping/',
    success_message: 'grouping items',
    schema_imports: [
      '../../../database/schema/factory/grouping/grouping_done.schema.js',
    ],
  },
  tapping: {
    kind: 'parent_child',
    parent_model_name: 'tapping_done_other_details',
    parent_sheet_names: ['Other Details', 'Tapping Details'],
    child_sheets: [
      {
        model_name: 'tapping_done_items_details',
        sheet_names: ['Item Details', 'Tapping Items', 'Tapping Item Details'],
        foreign_key: 'tapping_done_other_details_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'tapping_sr_no'],
    filepath: '/bulk_uploads/factory/tapping/',
    success_message: 'tapping items',
    schema_imports: [
      '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js',
    ],
  },
  resizing: {
    kind: 'single',
    model_name: 'plywood_resizing_done_details',
    sheet_names: ['Resizing Details', 'Plywood Resizing', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/resizing/',
    success_message: 'resizing records',
    schema_imports: [
      '../../../database/schema/factory/plywood_resizing_factory/resizing_done/resizing.done.schema.js',
    ],
  },
  pressing: {
    kind: 'parent_child',
    parent_model_name: 'pressing_done_details',
    parent_sheet_names: ['Other Details', 'Pressing Details'],
    child_sheets: [
      {
        model_name: 'pressing_done_consumed_items_details',
        sheet_names: [
          'Consumed Items',
          'Consumed Item Details',
          'Pressing Consumed Items',
        ],
        foreign_key: 'pressing_done_details_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'pressing_sr_no'],
    filepath: '/bulk_uploads/factory/pressing/',
    success_message: 'pressing consumed item records',
    schema_imports: [
      '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js',
    ],
  },
  plywood_production: {
    kind: 'parent_child',
    parent_model_name: 'plywood_production',
    parent_sheet_names: ['Other Details', 'Plywood Production Details', 'Plywood Production'],
    child_sheets: [
      {
        model_name: 'plywood_production_consumed_item',
        sheet_names: [
          'Consumed Items',
          'Consumed Item Details',
          'Plywood Production Consumed Items',
        ],
        foreign_key: 'plywood_production_id',
      },
    ],
    link_headers: [...BULK_LINK_HEADERS, 'plywood_production_sr_no'],
    filepath: '/bulk_uploads/factory/plywood_production/',
    success_message: 'plywood production consumed item records',
    schema_imports: [
      '../../../database/schema/factory/plywood_production/plywood_production.schema.js',
    ],
  },
  cnc: {
    kind: 'single',
    model_name: 'cnc_done_details',
    sheet_names: ['CNC Details', 'CNC Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/cnc/',
    success_message: 'cnc records',
    schema_imports: [
      '../../../database/schema/factory/cnc/cnc_done/cnc_done.schema.js',
    ],
  },
  bunito: {
    kind: 'single',
    model_name: 'bunito_done_details',
    sheet_names: ['Bunito Details', 'Bunito Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/bunito/',
    success_message: 'bunito records',
    schema_imports: [
      '../../../database/schema/factory/bunito/bunito_done/bunito_done.schema.js',
    ],
  },
  color: {
    kind: 'single',
    model_name: 'color_done_details',
    sheet_names: ['Color Details', 'Colour Details', 'Color Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/color/',
    success_message: 'color records',
    schema_imports: [
      '../../../database/schema/factory/colour/colour_done/colour_done.schema.js',
    ],
  },
  canvas: {
    kind: 'single',
    model_name: 'canvas_done_details',
    sheet_names: ['Canvas Details', 'Canvas Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/canvas/',
    success_message: 'canvas records',
    schema_imports: [
      '../../../database/schema/factory/canvas/canvas_done/canvas_done.schema.js',
    ],
  },
  polishing: {
    kind: 'single',
    model_name: 'polishing_done_details',
    sheet_names: ['Polishing Details', 'Polishing Done', 'Sheet 1', 'Sheet1'],
    filepath: '/bulk_uploads/factory/polishing/',
    success_message: 'polishing records',
    schema_imports: [
      '../../../database/schema/factory/polishing/polishing_done/polishing_done.schema.js',
    ],
  },
};

const schema_import_cache = new Map();
const schema_path_lookup_cache = new Map();

const parse_form = (req, form) => {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

const handle_nested_values = (doc, field, value) => {
  const field_parts = field.split('.');
  let current = doc;
  for (let i = 0; i < field_parts.length - 1; i++) {
    const part = field_parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  current[field_parts[field_parts.length - 1]] = value;
  return doc;
};

const is_empty_value = (value) => {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  );
};

const get_cell_value = (cell) => {
  let raw_value = cell?.value ?? null;

  if (raw_value && typeof raw_value === 'object') {
    if (raw_value.result !== undefined) {
      raw_value = raw_value.result;
    } else if (raw_value.richText) {
      raw_value = raw_value.richText.map((text) => text.text).join('');
    } else if (raw_value.text !== undefined) {
      raw_value = raw_value.text;
    }
  }

  if (typeof raw_value === 'string') {
    raw_value = raw_value.trim();
  }

  return raw_value === '' ? null : raw_value;
};

const normalize_key = (value) => String(value).trim();

const normalize_string = (value) => {
  if (is_empty_value(value)) return null;
  return String(value).trim();
};

const normalize_required_string = (value, field) => {
  const normalized = normalize_string(value);
  if (!normalized) {
    throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
  }
  return normalized;
};

const normalize_number = (value, field, default_value = undefined) => {
  if (is_empty_value(value)) {
    if (default_value !== undefined) return default_value;
    throw new ApiError(`${field} is required`, StatusCodes.BAD_REQUEST);
  }

  const cleaned_value =
    typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  const number_value = Number(cleaned_value);
  if (Number.isNaN(number_value)) {
    throw new ApiError(
      `${field} must be a valid number`,
      StatusCodes.BAD_REQUEST
    );
  }

  return number_value;
};

const normalize_boolean = (value, field) => {
  if (is_empty_value(value)) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;

  throw new ApiError(`${field} must be a valid boolean`, StatusCodes.BAD_REQUEST);
};

const normalize_object_id = (value, field) => {
  if (is_empty_value(value)) return null;

  const object_id = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(object_id)) {
    throw new ApiError(
      `${field} must be a valid ObjectId`,
      StatusCodes.BAD_REQUEST
    );
  }

  return new mongoose.Types.ObjectId(object_id);
};

const parse_json_value = (value, field) => {
  if (is_empty_value(value)) return undefined;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new ApiError(
      `${field} must contain valid JSON`,
      StatusCodes.BAD_REQUEST
    );
  }
};

const normalize_array_value = (value, field) => {
  if (is_empty_value(value)) return undefined;
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const parsed = parse_json_value(value, field);
    if (Array.isArray(parsed)) return parsed;
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value];
};

const normalize_date_value = (value, field) => {
  if (is_empty_value(value)) return undefined;
  const parsed_date = format_date(value);
  if (!parsed_date) {
    throw new ApiError(`${field} must be a valid date`, StatusCodes.BAD_REQUEST);
  }
  return parsed_date;
};

const normalize_factory_name = (factory_name) => {
  const normalized = String(factory_name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  return FACTORY_NAME_ALIASES[normalized] || normalized;
};

const find_worksheet_by_name = (workbook, names) => {
  const normalized_names = (names || []).map((name) => name.toLowerCase());
  return workbook.worksheets.find((worksheet) =>
    normalized_names.includes(worksheet.name.toLowerCase())
  );
};

const find_available_worksheet = (
  workbook,
  preferred_names = [],
  excluded_sheet_names = new Set()
) => {
  const preferred_sheet = find_worksheet_by_name(workbook, preferred_names);
  if (preferred_sheet) return preferred_sheet;

  return (
    workbook.worksheets.find(
      (worksheet) => !excluded_sheet_names.has(worksheet.name.toLowerCase())
    ) || null
  );
};

const ensure_schema_imports = async (import_paths = []) => {
  const import_tasks = import_paths.map((import_path) => {
    if (!schema_import_cache.has(import_path)) {
      schema_import_cache.set(import_path, import(import_path));
    }
    return schema_import_cache.get(import_path);
  });

  await Promise.all(import_tasks);
};

const get_registered_model = (model_name) => {
  const registered_model = mongoose.models[model_name];
  if (!registered_model) {
    throw new ApiError(
      `Model ${model_name} is not registered`,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
  return registered_model;
};

const get_model_schema_path_lookup = (model_name) => {
  if (!schema_path_lookup_cache.has(model_name)) {
    const registered_model = get_registered_model(model_name);
    const path_lookup = new Map();
    Object.keys(registered_model.schema.paths).forEach((path_name) => {
      path_lookup.set(path_name.toLowerCase(), path_name);
    });
    schema_path_lookup_cache.set(model_name, path_lookup);
  }

  return schema_path_lookup_cache.get(model_name);
};

const coerce_value_by_schema = (schema_type, value, field) => {
  if (is_empty_value(value)) return undefined;

  const schema_instance = schema_type?.instance;

  switch (schema_instance) {
    case 'ObjectId':
      return normalize_object_id(value, field);
    case 'Number':
      return normalize_number(value, field);
    case 'Boolean':
      return normalize_boolean(value, field);
    case 'Date':
      return normalize_date_value(value, field);
    case 'Array':
      return normalize_array_value(value, field);
    case 'String':
      return normalize_string(value);
    default:
      return parse_json_value(value, field);
  }
};

const get_validation_message = (validation_error) => {
  const first_error = Object.values(validation_error?.errors || {})[0];
  return first_error?.message || validation_error?.message || 'Validation failed';
};

const build_validated_instance = ({
  model_name,
  doc,
  row_number,
  sheet_name,
  user,
}) => {
  const RegisteredModel = get_registered_model(model_name);
  const prepared_doc = { ...doc };

  if (
    RegisteredModel.schema.path('created_by') &&
    is_empty_value(prepared_doc.created_by)
  ) {
    prepared_doc.created_by = user?._id;
  }

  if (
    RegisteredModel.schema.path('updated_by') &&
    is_empty_value(prepared_doc.updated_by)
  ) {
    prepared_doc.updated_by = user?._id;
  }

  const instance = new RegisteredModel(prepared_doc);
  const validation_error = instance.validateSync();

  if (validation_error) {
    throw new ApiError(
      `${sheet_name} row ${row_number}: ${get_validation_message(validation_error)}`,
      StatusCodes.BAD_REQUEST
    );
  }

  return instance;
};

const build_sheet_rows = ({
  worksheet,
  model_name,
  link_headers = [],
}) => {
  const registered_model = get_registered_model(model_name);
  const schema_path_lookup = get_model_schema_path_lookup(model_name);
  const header_row = worksheet.getRow(1);
  const sheet_columns = [];

  for (let column_index = 1; column_index <= worksheet.columnCount; column_index++) {
    const header_value = get_cell_value(header_row.getCell(column_index));
    if (is_empty_value(header_value)) continue;

    const normalized_header = String(header_value).trim();
    const lower_header = normalized_header.toLowerCase();

    if (link_headers.some((header) => header.toLowerCase() === lower_header)) {
      sheet_columns.push({
        kind: 'link',
        column_index,
      });
      continue;
    }

    const actual_path = schema_path_lookup.get(lower_header);
    if (!actual_path) continue;

    sheet_columns.push({
      kind: 'field',
      column_index,
      path: actual_path,
      schema_type: registered_model.schema.path(actual_path),
    });
  }

  if (!sheet_columns.some((column) => column.kind === 'field')) {
    throw new ApiError(
      `${worksheet.name} must contain at least one valid schema header`,
      StatusCodes.BAD_REQUEST
    );
  }

  const rows = [];

  for (let row_number = 2; row_number <= worksheet.rowCount; row_number++) {
    const row = worksheet.getRow(row_number);
    const doc = {};
    let link_key = null;
    let has_values = false;

    for (const column of sheet_columns) {
      const raw_value = get_cell_value(row.getCell(column.column_index));
      if (is_empty_value(raw_value)) continue;

      has_values = true;

      if (column.kind === 'link') {
        link_key = normalize_key(raw_value);
        continue;
      }

      const coerced_value = coerce_value_by_schema(
        column.schema_type,
        raw_value,
        column.path
      );
      if (coerced_value !== undefined) {
        handle_nested_values(doc, column.path, coerced_value);
      }
    }

    if (!has_values) continue;

    rows.push({
      row_number,
      link_key,
      doc,
    });
  }

  return rows;
};

const insert_instances_in_batches = async ({
  instances,
  model_name,
  session,
}) => {
  if (instances.length === 0) return 0;

  const RegisteredModel = get_registered_model(model_name);
  let inserted_total = 0;

  for (
    let start_index = 0;
    start_index < instances.length;
    start_index += FACTORY_BULK_UPLOAD_BATCH_SIZE
  ) {
    const batch = instances
      .slice(start_index, start_index + FACTORY_BULK_UPLOAD_BATCH_SIZE)
      .map((instance) => instance.toObject());

    await RegisteredModel.insertMany(batch, { session });
    inserted_total += batch.length;
  }

  return inserted_total;
};

const run_generic_single_model_upload = async ({
  file_path,
  config,
  session,
  user,
}) => {
  await ensure_schema_imports(config.schema_imports);

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(file_path);

  const worksheet =
    find_worksheet_by_name(workbook, config.sheet_names) ||
    workbook.worksheets[0];

  if (!worksheet) {
    throw new ApiError('A worksheet is required', StatusCodes.BAD_REQUEST);
  }

  const sheet_rows = build_sheet_rows({
    worksheet,
    model_name: config.model_name,
  });

  if (sheet_rows.length === 0) {
    throw new ApiError(
      `At least one ${config.success_message} row is required`,
      StatusCodes.BAD_REQUEST
    );
  }

  const instances = sheet_rows.map((row) =>
    build_validated_instance({
      model_name: config.model_name,
      doc: row.doc,
      row_number: row.row_number,
      sheet_name: worksheet.name,
      user,
    })
  );

  session.startTransaction();
  try {
    const total = await insert_instances_in_batches({
      instances,
      model_name: config.model_name,
      session,
    });

    await session.commitTransaction();
    return {
      total,
      message: `Successfully uploaded ${total} ${config.success_message}`,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
};

const run_generic_parent_child_upload = async ({
  file_path,
  config,
  session,
  user,
}) => {
  await ensure_schema_imports(config.schema_imports);

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(file_path);

  const used_sheet_names = new Set();
  const parent_worksheet = find_available_worksheet(
    workbook,
    config.parent_sheet_names,
    used_sheet_names
  );

  if (!parent_worksheet) {
    throw new ApiError(
      `${config.parent_sheet_names.join(' or ')} sheet is required`,
      StatusCodes.BAD_REQUEST
    );
  }

  used_sheet_names.add(parent_worksheet.name.toLowerCase());

  const parent_rows = build_sheet_rows({
    worksheet: parent_worksheet,
    model_name: config.parent_model_name,
    link_headers: config.link_headers || BULK_LINK_HEADERS,
  });

  if (parent_rows.length === 0) {
    throw new ApiError(
      `At least one ${parent_worksheet.name} row is required`,
      StatusCodes.BAD_REQUEST
    );
  }

  const parent_id_map = new Map();
  const parent_instances = [];

  for (const row of parent_rows) {
    if (!row.link_key) {
      throw new ApiError(
        `${parent_worksheet.name} row ${row.row_number}: bulk link key is required`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (parent_id_map.has(row.link_key)) {
      throw new ApiError(
        `${parent_worksheet.name} row ${row.row_number}: duplicate bulk link key ${row.link_key}`,
        StatusCodes.BAD_REQUEST
      );
    }

    const parent_instance = build_validated_instance({
      model_name: config.parent_model_name,
      doc: row.doc,
      row_number: row.row_number,
      sheet_name: parent_worksheet.name,
      user,
    });

    parent_id_map.set(row.link_key, parent_instance._id);
    parent_instances.push(parent_instance);
  }

  const child_upload_sets = [];
  let total_child_rows = 0;

  for (const child_config of config.child_sheets) {
    const child_worksheet = find_available_worksheet(
      workbook,
      child_config.sheet_names,
      used_sheet_names
    );

    if (!child_worksheet) {
      throw new ApiError(
        `${child_config.sheet_names.join(' or ')} sheet is required`,
        StatusCodes.BAD_REQUEST
      );
    }

    used_sheet_names.add(child_worksheet.name.toLowerCase());

    const child_rows = build_sheet_rows({
      worksheet: child_worksheet,
      model_name: child_config.model_name,
      link_headers: config.link_headers || BULK_LINK_HEADERS,
    });

    if (child_rows.length === 0) {
      throw new ApiError(
        `At least one ${child_worksheet.name} row is required`,
        StatusCodes.BAD_REQUEST
      );
    }

    const child_instances = child_rows.map((row) => {
      const child_doc = { ...row.doc };

      if (is_empty_value(child_doc[child_config.foreign_key])) {
        if (!row.link_key) {
          throw new ApiError(
            `${child_worksheet.name} row ${row.row_number}: bulk link key is required`,
            StatusCodes.BAD_REQUEST
          );
        }

        const parent_id = parent_id_map.get(row.link_key);
        if (!parent_id) {
          throw new ApiError(
            `${child_worksheet.name} row ${row.row_number}: no matching parent row found for ${row.link_key}`,
            StatusCodes.BAD_REQUEST
          );
        }

        child_doc[child_config.foreign_key] = parent_id;
      }

      return build_validated_instance({
        model_name: child_config.model_name,
        doc: child_doc,
        row_number: row.row_number,
        sheet_name: child_worksheet.name,
        user,
      });
    });

    total_child_rows += child_instances.length;
    child_upload_sets.push({
      model_name: child_config.model_name,
      instances: child_instances,
    });
  }

  session.startTransaction();
  try {
    await insert_instances_in_batches({
      instances: parent_instances,
      model_name: config.parent_model_name,
      session,
    });

    for (const child_set of child_upload_sets) {
      await insert_instances_in_batches({
        instances: child_set.instances,
        model_name: child_set.model_name,
        session,
      });
    }

    await session.commitTransaction();
    return {
      total: total_child_rows || parent_instances.length,
      message: `Successfully uploaded ${
        total_child_rows || parent_instances.length
      } ${config.success_message}`,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
};

const fetch_master_by_name = async ({
  model_name,
  query_field,
  value,
  label,
  session,
  cache,
  optional = false,
}) => {
  if (is_empty_value(value)) {
    if (optional) return null;
    throw new ApiError(`${label} is required`, StatusCodes.BAD_REQUEST);
  }

  const normalized_value = String(value).trim().toUpperCase();
  const cache_key = `${model_name}:${query_field}:${normalized_value}`;
  if (cache.has(cache_key)) return cache.get(cache_key);

  const details = await model(model_name)
    .findOne({ [query_field]: normalized_value })
    .lean()
    .session(session);

  if (!details) {
    throw new ApiError(`${label} not found -> ${value}`, StatusCodes.BAD_REQUEST);
  }

  cache.set(cache_key, details);
  return details;
};

const add_factory_other_details_data = (doc, user) => {
  const dressing_sr_no = normalize_required_string(
    doc.dressing_sr_no,
    'Dressing SR No'
  );

  const dressing_date = format_date(doc.dressing_date);
  if (!dressing_date) {
    throw new ApiError('Dressing date is required', StatusCodes.BAD_REQUEST);
  }

  const other_details = {
    slicing_done_other_details_id: normalize_object_id(
      doc.slicing_done_other_details_id,
      'Slicing done other details id'
    ),
    peeling_done_other_details_id: normalize_object_id(
      doc.peeling_done_other_details_id,
      'Peeling done other details id'
    ),
    dressing_date,
    shift: normalize_string(doc.shift),
    no_of_workers: normalize_number(doc.no_of_workers, 'No. of Workers'),
    no_of_working_hours: normalize_number(
      doc.no_of_working_hours,
      'No. of Working hours'
    ),
    no_of_total_hours: normalize_number(
      doc.no_of_total_hours,
      'No. of Total hours'
    ),
    remark: normalize_string(doc.remark),
    created_by: user?._id,
    updated_by: user?._id,
  };

  return {
    dressing_sr_no,
    other_details,
  };
};

async function add_dressing_details(doc, session, dressing_sr_no_set, cache) {
  const dressing_sr_no = normalize_required_string(
    doc.dressing_sr_no,
    'Dressing SR No'
  );
  const dressing_done_other_details_id =
    dressing_sr_no_set.get(normalize_key(dressing_sr_no));

  if (!dressing_done_other_details_id) {
    throw new ApiError(
      `No Dressing Details found for Dressing SR No: ${dressing_sr_no}. Please check if it matches the Other Details sheet.`,
      StatusCodes.BAD_REQUEST
    );
  }

  const item_details = await fetch_master_by_name({
    model_name: 'item_name',
    query_field: 'item_name',
    value: doc.item_name,
    label: 'Item',
    session,
    cache,
  });
  const subcategory_details = await fetch_master_by_name({
    model_name: 'item_subcategory',
    query_field: 'name',
    value: doc.item_sub_category_name,
    label: 'Sub Category',
    session,
    cache,
  });
  const color_details = await fetch_master_by_name({
    model_name: 'colors',
    query_field: 'name',
    value: doc.color_name,
    label: 'Color',
    session,
    cache,
    optional: true,
  });
  const character_details = await fetch_master_by_name({
    model_name: 'characters',
    query_field: 'name',
    value: doc.character_name,
    label: 'Character',
    session,
    cache,
  });
  const pattern_details = await fetch_master_by_name({
    model_name: 'patterns',
    query_field: 'name',
    value: doc.pattern_name,
    label: 'Pattern',
    session,
    cache,
  });
  const series_details = await fetch_master_by_name({
    model_name: 'series_master',
    query_field: 'series_name',
    value: doc.series_name,
    label: 'Series',
    session,
    cache,
  });
  const grade_details = await fetch_master_by_name({
    model_name: 'grade',
    query_field: 'grade_name',
    value: doc.grade_name,
    label: 'Grade',
    session,
    cache,
  });

  doc.dressing_done_other_details_id = dressing_done_other_details_id;
  doc.log_no_code = normalize_required_string(doc.log_no_code, 'Log No. Code');
  doc.item_name = item_details.item_name;
  doc.item_name_id = item_details._id;
  doc.item_sub_category_name = subcategory_details.name;
  doc.item_sub_category_id = subcategory_details._id;
  doc.pallet_number = normalize_required_string(doc.pallet_number, 'Pallet Number');
  doc.bundle_number = normalize_number(doc.bundle_number, 'Bundle Number');
  doc.length = normalize_number(doc.length, 'Length');
  doc.width = normalize_number(doc.width, 'Width');
  doc.thickness = normalize_number(doc.thickness, 'Thickness');
  doc.no_of_leaves = normalize_number(doc.no_of_leaves, 'No. of Leaves');
  doc.sqm = normalize_number(doc.sqm, 'SQM');
  doc.volume = is_empty_value(doc.volume)
    ? Number(((doc.sqm * doc.thickness) / 1000).toFixed(3))
    : normalize_number(doc.volume, 'Volume');
  doc.amount = normalize_number(doc.amount, 'Amount');
  doc.color_id = color_details?._id || null;
  doc.color_name = color_details?.name || null;
  doc.character_name = character_details.name;
  doc.character_id = character_details._id;
  doc.pattern_name = pattern_details.name;
  doc.pattern_id = pattern_details._id;
  doc.series_name = series_details.series_name;
  doc.series_id = series_details._id;
  doc.grade_name = grade_details.grade_name;
  doc.grade_id = grade_details._id;
  doc.amount_factor = normalize_number(doc.amount_factor, 'Amount Factor', 1);
  doc.expense_amount = normalize_number(doc.expense_amount, 'Expense Amount', 0);
  doc.remark = normalize_string(doc.remark);

  delete doc.dressing_sr_no;
  return doc;
}

const add_items_to_source_summary = (summary, parent_id, item) => {
  if (!summary.has(parent_id)) {
    summary.set(parent_id, {
      leaves_by_log_no_code: new Map(),
      thickness_by_log_no_code: new Map(),
    });
  }

  const parent_summary = summary.get(parent_id);
  const leaves = parent_summary.leaves_by_log_no_code.get(item.log_no_code) || 0;
  parent_summary.leaves_by_log_no_code.set(
    item.log_no_code,
    leaves + item.no_of_leaves
  );

  if (!parent_summary.thickness_by_log_no_code.has(item.log_no_code)) {
    parent_summary.thickness_by_log_no_code.set(item.log_no_code, new Set());
  }
  parent_summary.thickness_by_log_no_code
    .get(item.log_no_code)
    .add(item.thickness);
};

const validate_and_update_source_details = async ({
  parent_details_by_id,
  source_summary,
  session,
  user,
}) => {
  for (const [parent_id, summary] of source_summary.entries()) {
    const parent_details = parent_details_by_id.get(parent_id);
    if (!parent_details) continue;

    const peeling_id = parent_details.peeling_done_other_details_id;
    const slicing_id = parent_details.slicing_done_other_details_id;
    if (!peeling_id && !slicing_id) continue;

    const source_item_model = peeling_id
      ? peeling_done_items_model
      : slicing_done_items_model;
    const source_other_details_model = peeling_id
      ? peeling_done_other_details_model
      : slicing_done_other_details_model;
    const source_other_details_id = peeling_id || slicing_id;
    const source_field = peeling_id
      ? 'peeling_done_other_details_id'
      : 'slicing_done_other_details_id';

    const source_items = await source_item_model
      .find({ [source_field]: source_other_details_id })
      .lean()
      .session(session);

    if (source_items.length === 0) {
      throw new ApiError(
        `${peeling_id ? 'Peeling' : 'Slicing'} Done item details not found`,
        StatusCodes.NOT_FOUND
      );
    }

    const source_item_map = source_items.reduce((acc, item) => {
      acc[item.log_no_code] = item;
      return acc;
    }, {});

    for (const [log_no_code, leaves] of summary.leaves_by_log_no_code.entries()) {
      const source_item = source_item_map[log_no_code];
      if (!source_item) {
        throw new ApiError(
          `Source item not found for Log No. Code ${log_no_code}`,
          StatusCodes.BAD_REQUEST
        );
      }

      if (leaves !== source_item.no_of_leaves) {
        throw new ApiError(
          `No.of Leaves Mismatch for ${log_no_code}, Actual No. of Leaves Issued : ${source_item.no_of_leaves}, Dressing Done No.of Leaves : ${leaves}`,
          StatusCodes.BAD_REQUEST
        );
      }

      const thickness_set = summary.thickness_by_log_no_code.get(log_no_code);
      if (!thickness_set.has(source_item.thickness) || thickness_set.size > 1) {
        throw new ApiError(
          `Thickness mismatch for Log No.Code ${log_no_code}`,
          StatusCodes.BAD_REQUEST
        );
      }
    }

    await source_item_model.updateMany(
      { [source_field]: source_other_details_id },
      {
        $set: {
          is_dressing_done: true,
          issue_status: issues_for_status.dressing,
        },
      },
      { session }
    );

    await source_other_details_model.updateOne(
      { _id: source_other_details_id },
      {
        $set: {
          isEditable: false,
          updated_by: user?._id,
        },
      },
      { session }
    );
  }
};

const run_custom_dressing_upload = async ({
  file_path,
  config,
  session,
  user,
}) => {
  const dressing_sr_no_set = new Map();
  const parent_details_by_id = new Map();
  const source_summary = new Map();
  const cache = new Map();
  let buffer_data = [];
  let total = 0;

  session.startTransaction();
  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(file_path);

    const other_details_worksheet = find_worksheet_by_name(
      workbook,
      config.other_details_sheet_names
    );
    if (!other_details_worksheet) {
      throw new ApiError(
        `${config.other_details_sheet_names.join(' or ')} sheet is required`,
        StatusCodes.BAD_REQUEST
      );
    }

    const other_details_rows =
      other_details_worksheet.getRows(2, other_details_worksheet.rowCount) || [];
    const other_details_buffer_data = [];
    const other_details_keys = [];

    for (const row of other_details_rows) {
      if (is_empty_value(get_cell_value(row.getCell(1)))) continue;

      const other_details_doc = {};
      config.other_details_fields.forEach((field, index) => {
        handle_nested_values(
          other_details_doc,
          field,
          get_cell_value(row.getCell(index + 1))
        );
      });

      const prepared_other_details = add_factory_other_details_data(
        other_details_doc,
        user
      );
      other_details_keys.push(normalize_key(prepared_other_details.dressing_sr_no));
      other_details_buffer_data.push(prepared_other_details.other_details);
    }

    if (other_details_buffer_data.length === 0) {
      throw new ApiError(
        'At least one Dressing Details row is required',
        StatusCodes.BAD_REQUEST
      );
    }

    const other_details_result = await model(config.other_details_model).insertMany(
      other_details_buffer_data,
      { session }
    );

    other_details_result.forEach((details, index) => {
      const key = other_details_keys[index];
      dressing_sr_no_set.set(key, details._id);
      parent_details_by_id.set(String(details._id), details);
    });

    const excluded_sheet_names = new Set(
      config.other_details_sheet_names.map((name) => name.toLowerCase())
    );
    const item_worksheet = workbook.worksheets.find(
      (worksheet) => !excluded_sheet_names.has(worksheet.name.toLowerCase())
    );

    if (!item_worksheet) {
      throw new ApiError('Item Details sheet is required', StatusCodes.BAD_REQUEST);
    }

    const item_rows = item_worksheet.getRows(2, item_worksheet.rowCount) || [];
    for (const row of item_rows) {
      if (is_empty_value(get_cell_value(row.getCell(1)))) continue;

      const item_doc = {};
      config.fields.forEach((field, index) => {
        handle_nested_values(
          item_doc,
          field,
          get_cell_value(row.getCell(index + 1))
        );
      });

      const item_details = await config.handler(
        item_doc,
        session,
        dressing_sr_no_set,
        cache
      );

      const parent_id = String(item_details.dressing_done_other_details_id);
      add_items_to_source_summary(source_summary, parent_id, item_details);

      buffer_data.push({
        ...item_details,
        created_by: user?._id,
        updated_by: user?._id,
      });

      if (buffer_data.length >= FACTORY_BULK_UPLOAD_BATCH_SIZE) {
        await model(config.item_model).insertMany(buffer_data, { session });
        total += buffer_data.length;
        buffer_data = [];
      }
    }

    if (buffer_data.length > 0) {
      await model(config.item_model).insertMany(buffer_data, { session });
      total += buffer_data.length;
    }

    if (total === 0) {
      throw new ApiError(
        'At least one Dressing item row is required',
        StatusCodes.BAD_REQUEST
      );
    }

    await validate_and_update_source_details({
      parent_details_by_id,
      source_summary,
      session,
      user,
    });

    await session.commitTransaction();
    return {
      total,
      message: `Successfully uploaded ${total} dressing items`,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  }
};

export const bulk_upload_factory = catchAsync(async (req, res, next) => {
  const normalized_factory_name = normalize_factory_name(req.query.factory_name);
  const user = req.userDetails;

  if (!normalized_factory_name) {
    throw new ApiError('Factory name is required', StatusCodes.BAD_REQUEST);
  }

  // Non-dressing factory upload configs are intentionally kept in this file
  // for reference, but only dressing is currently enabled.
  if (!ENABLED_FACTORY_BULK_UPLOADS.has(normalized_factory_name)) {
    throw new ApiError(
      'Only dressing bulk upload is enabled currently',
      StatusCodes.BAD_REQUEST
    );
  }

  const config = factory_config_model[normalized_factory_name];
  if (!config) {
    throw new ApiError('Invalid Factory name', StatusCodes.BAD_REQUEST);
  }

  const upload_dir = path.join(process.cwd(), 'public', 'upload', config.filepath);
  if (!fs.existsSync(upload_dir)) {
    fs.mkdirSync(upload_dir, { recursive: true });
  }

  const form = formidable({
    uploadDir: upload_dir,
    allowEmptyFiles: false,
    multiples: false,
    keepExtensions: true,
    filename: (name, ext) => `${name}_${Date.now()}${ext}`,
  });

  let uploaded_file_path = null;
  const session = await mongoose.startSession();

  try {
    const { files } = await parse_form(req, form);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    uploaded_file_path = file?.filepath;

    if (!file) {
      throw new ApiError('File is required', StatusCodes.BAD_REQUEST);
    }

    let upload_result = null;

    if (config.kind === 'custom_dressing') {
      upload_result = await run_custom_dressing_upload({
        file_path: file.filepath,
        config,
        session,
        user,
      });
    } else if (config.kind === 'single') {
      upload_result = await run_generic_single_model_upload({
        file_path: file.filepath,
        config,
        session,
        user,
      });
    } else if (config.kind === 'parent_child') {
      upload_result = await run_generic_parent_child_upload({
        file_path: file.filepath,
        config,
        session,
        user,
      });
    } else {
      throw new ApiError(
        'Unsupported factory upload configuration',
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(StatusCodes.OK, upload_result.message, null));
  } catch (error) {
    console.error('Factory bulk upload error:', error);
    return next(
      new ApiError(
        error.message || 'Factory bulk upload failed',
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  } finally {
    await session.endSession();

    if (uploaded_file_path && fs.existsSync(uploaded_file_path)) {
      fs.unlinkSync(uploaded_file_path);
    }
  }
});
