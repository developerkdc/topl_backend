import mongoose, { model } from 'mongoose';
import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../../utils/constants.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import {
  pressing_done_details_model,
  pressing_done_consumed_items_details_model,
} from '../../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import machineModel from '../../../../database/schema/masters/machine.schema.js';
import { grouping_done_items_details_model } from '../../../../database/schema/factory/grouping/grouping_done.schema.js';
import { plywood_inventory_items_details } from '../../../../database/schema/inventory/Plywood/plywood.schema.js';
import { mdf_inventory_items_details } from '../../../../database/schema/inventory/mdf/mdf.schema.js';
import { fleece_inventory_items_modal } from '../../../../database/schema/inventory/fleece/fleece.schema.js';
import {
  base_type_constants,
  consumed_from_constants,
  item_issued_for,
} from '../../../../database/Utils/constants/constants.js';

// ─── Safe helpers ─────────────────────────────────────────────────────────────
const getCellValue = (cell) => {
  const val = cell.value;
  if (val && typeof val === 'object') {
    if ('result' in val) return val.result;
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((rt) => rt.text).join('');
    }
  }
  return val;
};

const toStr = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'object') {
    return JSON.stringify(val).toUpperCase(); // Fallback for debugging, but getCellValue should handle most cases
  }
  return String(val).trim().toUpperCase();
};

const toNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// ─── Parse formidable form ────────────────────────────────────────────────────
const parse_form = (req, form) =>
  new Promise((resolve, reject) =>
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    })
  );

const resolve_row = async (row, created_by, session) => {
  const pressing_id = toStr(getCellValue(row.getCell(1)));
  const machine_name = toStr(getCellValue(row.getCell(2)));
  const group_no = toStr(getCellValue(row.getCell(3)));
  const item_name_veneer = toStr(getCellValue(row.getCell(4)));
  const product_type = getCellValue(row.getCell(6))?.toString().trim();
  const length = toNum(getCellValue(row.getCell(7)));
  const width = toNum(getCellValue(row.getCell(8)));
  const veneer_thickness = toNum(getCellValue(row.getCell(9)));
  const sheets = toNum(getCellValue(row.getCell(10)));
  const sqm = toNum(getCellValue(row.getCell(11)));
  const amount = toNum(getCellValue(row.getCell(12)));

  const base_type_str = toStr(getCellValue(row.getCell(13)));
  const base_item_name = toStr(getCellValue(row.getCell(14)));
  const base_sub_category = toStr(getCellValue(row.getCell(15)));
  const base_length = toNum(getCellValue(row.getCell(16)));
  const base_width = toNum(getCellValue(row.getCell(17)));
  const base_thickness = toNum(getCellValue(row.getCell(18)));
  const base_roll_sheets = toNum(getCellValue(row.getCell(19)));

  if (!pressing_id || !group_no) return null;

  // 1. Lookup Machine
  if (!machine_name) {
    throw new ApiError('Machine Name is required', StatusCodes.BAD_REQUEST);
  }
  const machine = await machineModel.findOne({ machine_name }).session(session).lean();
  if (!machine) {
    throw new ApiError(`Machine "${machine_name}" not found in masters`, StatusCodes.BAD_REQUEST);
  }
  const machine_id = machine._id;

  // 2. Lookup Group (Veneer)
  if (!group_no) {
    throw new ApiError('Group No is required', StatusCodes.BAD_REQUEST);
  }
  const group_data = await grouping_done_items_details_model.findOne({ group_no }).session(session).lean();
  if (!group_data) {
    throw new ApiError(`Group No "${group_no}" not found in Grouping Done`, StatusCodes.BAD_REQUEST);
  }

  // 3. Lookup Base Item in Inventory
  if (!base_item_name) {
    throw new ApiError('Base Item Name is required', StatusCodes.BAD_REQUEST);
  }
  let base_item_data = null;
  if (base_type_str === 'PLYWOOD') {
    base_item_data = await plywood_inventory_items_details.findOne({ item_name: base_item_name }).session(session).lean();
  } else if (base_type_str === 'MDF') {
    base_item_data = await mdf_inventory_items_details.findOne({ item_name: base_item_name }).session(session).lean();
  } else if (base_type_str === 'FLEECE PAPER') {
    base_item_data = await fleece_inventory_items_modal.findOne({ item_name: base_item_name }).session(session).lean();
  }

  if (!base_item_data) {
    throw new ApiError(`Base Item "${base_item_name}" not found in ${base_type_str} inventory`, StatusCodes.BAD_REQUEST);
  }

  // Calculate final thickness
  const final_thickness = base_thickness + veneer_thickness;

  // Prepare Header (pressing_done_details)
  const header_data = {
    pressing_date: new Date(),
    no_of_workers: 1,
    no_of_working_hours: 1,
    no_of_total_hours: 1,
    shift: 'DAY',
    machine_id,
    machine_name,
    group_no,
    group_no_id: group_data._id,
    group_no_array: [group_no],
    product_type: product_type || 'DECORATIVE',
    pressing_instructions: 'SINGLE SIDE',
    pressing_id,
    length,
    width,
    base_thickness,
    veneer_thickness,
    thickness: final_thickness,
    no_of_sheets: sheets,
    sqm,
    amount,
    issued_for: item_issued_for.stock,
    remark: 'BULK_UPLOAD',
    created_by,
    updated_by: created_by,
  };

  // Prepare Consumed Items
  const consumed_data = {
    group_details: [{
      issue_for_pressing_id: null, // To be filled after header save
      group_no_id: group_data._id,
      group_no,
      item_name: item_name_veneer || group_data.item_name || 'UNKNOWN',
      item_name_id: group_data.item_name_id,
      item_sub_category_id: group_data.item_sub_category_id,
      item_sub_category_name: group_data.item_sub_category_name || 'UNKNOWN',
      log_no_code: group_data.log_no_code || group_no,
      length: group_data.length,
      width: group_data.width,
      thickness: group_data.thickness,
      no_of_sheets: sheets,
      sqm: Math.round(group_data.length * group_data.width * sheets),
      amount: 0,
    }],
    base_details: [{
      base_type: base_type_str || base_type_constants.plywood,
      consumed_from: consumed_from_constants.inventory,
      consumed_from_item_id: base_item_data._id,
      item_name: base_item_name,
      item_name_id: base_item_data.item_id,
      item_sub_category_id: base_item_data.item_sub_category_id,
      item_sub_category_name: base_item_data.item_sub_category_name || base_sub_category || 'UNKNOWN',
      pallet_no: base_item_data.pallet_number?.toString() || '0',
      length: base_length,
      width: base_width,
      thickness: base_thickness,
      no_of_sheets: (base_type_str === 'FLEECE PAPER') ? 0 : base_roll_sheets,
      number_of_roll: (base_type_str === 'FLEECE PAPER') ? base_roll_sheets : 0,
      sqm: Math.round(base_length * base_width * base_roll_sheets),
      amount: 0,
    }],
    face_details: [],
    created_by,
    updated_by: created_by,
  };

  return { header_data, consumed_data };
};

export const bulk_upload_pressing_done = catchAsync(async (req, res) => {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  const { files } = await parse_form(req, form);
  const excelFile = files.file?.[0] || files.file;

  if (!excelFile) {
    throw new ApiError('Please upload an Excel file (field name: "file")', StatusCodes.BAD_REQUEST);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFile.filepath);
    const worksheet = workbook.worksheets[0];

    const results = [];
    const errors = [];
    const created_by = req.userDetails._id;

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.getCell(1).value) continue;

      try {
        const resolved = await resolve_row(row, created_by, session);
        if (!resolved) {
          errors.push({ row: i, error: 'Invalid row data or missing mandatory fields' });
          continue;
        }

        const header = new pressing_done_details_model(resolved.header_data);
        await header.save({ session });

        resolved.consumed_data.pressing_done_details_id = header._id;
        resolved.consumed_data.group_details[0].issue_for_pressing_id = header._id;

        const consumed = new pressing_done_consumed_items_details_model(resolved.consumed_data);
        await consumed.save({ session });

        results.push(header._id);
      } catch (err) {
        errors.push({ row: i, error: err.message });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      await session.abortTransaction();
      return res.status(StatusCodes.BAD_REQUEST).json(new ApiResponse(StatusCodes.BAD_REQUEST, { errors }, 'Bulk upload failed'));
    }

    await session.commitTransaction();
    res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, { 
      total: results.length, 
      errors: errors.length > 0 ? errors : undefined 
    }, 'Bulk upload completed successfully'));

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
    // Clean up temp file
    if (fs.existsSync(excelFile.filepath)) fs.unlinkSync(excelFile.filepath);
  }
});

