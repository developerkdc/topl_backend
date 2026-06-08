import mongoose, { model } from 'mongoose';
import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';
import {
  grouping_done_details_model,
  grouping_done_items_details_model,
} from '../../../database/schema/factory/grouping/grouping_done.schema.js';

// ─── Upload directory ─────────────────────────────────────────────────────────
const UPLOAD_DIR_RELATIVE = '/bulk_uploads/factory/grouping_done/';

// ─── Parse formidable form ────────────────────────────────────────────────────
const parse_form = (req, form) =>
  new Promise((resolve, reject) =>
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    })
  );

// ─── Safe helpers ─────────────────────────────────────────────────────────────
const toStr = (val) =>
  val !== null && val !== undefined && val !== ''
    ? String(val).trim().toUpperCase()
    : null;

const toNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// ─── Lookup a master record ───────────────────────────────────────────────────
async function lookupMaster({ collection, query, label, session }) {
  const doc = await model(collection).findOne(query).lean().session(session);
  if (!doc)
    throw new ApiError(
      `"${Object.values(query).join(', ')}" not found in ${label}`,
      StatusCodes.BAD_REQUEST
    );
  return doc;
}

// ─── Resolve all master lookups for one Excel row ────────────────────────────
/**
 * Client Excel format (1-indexed) – 17 columns:
 *  Col 1  → SR.NO           (skipped)
 *  Col 2  → ITEM NAME       → item_name lookup
 *  Col 3  → Other Item Name → SKIPPED (no schema field)
 *  Col 4  → logx no         → group_no AND log_no_code (same value)
 *  Col 5  → PHOTO           → photo_no lookup
 *  Col 6  → LENGTH          → length
 *  Col 7  → WEDTH           → width
 *  Col 8  → THICKNESS       → thickness
 *  Col 9  → process         → process_name lookup
 *  Col 10 → ProcessColor    → color_name lookup
 *  Col 11 → Series          → series_name lookup
 *  Col 12 → NATURAL: PLAIN (skipped) | HYBRID: Charactor (character_name)
 *  Col 13 → Pattarn         → pattern_name lookup
 *  Col 14 → SHEET           → no_of_sheets
 *  Col 15 → Sq. mtr         → sqm
 *  Col 16 → cost            → skipped
 *  Col 17 → AMT             → amount
 */
async function resolve_row(raw, subCategory, caches, session) {
  const item_name_str = toStr(raw.item_name);
  const logx_no = toStr(raw.logx_no); // used for BOTH group_no and log_no_code
  const sub_category_name = toStr(subCategory);
  const series_name = toStr(raw.series_name);
  const character_name = toStr(raw.character_name);  // only for HYBRID
  const process_name = toStr(raw.process_name);
  const process_color_name = toStr(raw.process_color_name);
  const pattern_name = toStr(raw.pattern_name);
  const photo_no = toStr(raw.photo_no);

  // Validate logx_no
  if (!logx_no) {
    throw new ApiError('logx no (Group No / Log No Code) is required', StatusCodes.BAD_REQUEST);
  }

  // Validate item_name
  if (!item_name_str) {
    throw new ApiError('ITEM NAME is required', StatusCodes.BAD_REQUEST);
  }

  // 1. Item name from cache
  const item_doc = caches.itemNameMap.get(item_name_str);
  if (!item_doc) {
    throw new ApiError(`Item Name "${item_name_str}" not found`, StatusCodes.BAD_REQUEST);
  }

  // 2. Sub-category from cache
  const sub_cat_doc = caches.subCategoryMap.get(sub_category_name);
  if (!sub_cat_doc) {
    throw new ApiError(`Sub-Category "${sub_category_name}" not found`, StatusCodes.BAD_REQUEST);
  }

  // 3. Series from cache
  if (!series_name) {
    throw new ApiError('Series is required', StatusCodes.BAD_REQUEST);
  }
  const series_doc = caches.seriesMap.get(series_name);
  if (!series_doc) {
    throw new ApiError(`Series "${series_name}" not found`, StatusCodes.BAD_REQUEST);
  }

  // 4. Grade & Character
  let grade_id = null;
  let resolved_grade_name = null;
  let character_id = null;
  let resolved_character_name = null;
  if (sub_category_name === 'HYBRID' && character_name) {
    const char_doc = caches.characterMap.get(character_name);
    if (char_doc) {
      character_id = char_doc._id;
      resolved_character_name = char_doc.name;
    }
  }

  // 5. Process
  let process_id = null;
  let resolved_process_name = null;
  if (process_name) {
    const proc_doc = caches.processMap.get(process_name);
    if (proc_doc) {
      process_id = proc_doc._id;
      resolved_process_name = proc_doc.name;
    }
  }

  // 6. Color
  let color_id = null;
  let resolved_color_name = null;
  if (process_color_name) {
    const color_doc = caches.colorMap.get(process_color_name);
    if (color_doc) {
      color_id = color_doc._id;
      resolved_color_name = color_doc.name;
    }
  }

  // 7. Pattern
  let pattern_id = null;
  let resolved_pattern_name = null;
  if (pattern_name) {
    const pat_doc = caches.patternMap.get(pattern_name);
    if (pat_doc) {
      pattern_id = pat_doc._id;
      resolved_pattern_name = pat_doc.name;
    }
  }

  let photo_no_id = null;

  // 9. Group No check against cache
  if (caches.existingGroupNoSet.has(logx_no)) {
    throw new ApiError(
      `Group No "${logx_no}" already exists in system`,
      StatusCodes.BAD_REQUEST
    );
  }

  return {
    group_no: logx_no,
    log_no_code: logx_no,
    photo_no: photo_no || null,
    photo_no_id,
    item_name: item_doc.item_name,
    item_name_id: item_doc._id,
    item_sub_category_id: sub_cat_doc._id,
    item_sub_category_name: sub_cat_doc.name,
    series_id: series_doc._id,
    series_name: series_doc.series_name,
    grade_id,
    grade_name: resolved_grade_name,
    character_id,
    character_name: resolved_character_name,
    process_id,
    process_name: resolved_process_name,
    color_id,
    color_name: resolved_color_name,
    pattern_id,
    pattern_name: resolved_pattern_name,
    length: toNum(raw.length),
    width: toNum(raw.width),
    thickness: toNum(raw.thickness),
    no_of_sheets: toNum(raw.no_of_sheets),
    sqm: toNum(raw.sqm),
    amount: toNum(raw.amount),
  };
}

// ─── Main controller ──────────────────────────────────────────────────────────
/**
 * POST /factory/grouping/bulk-upload-grouping-done?sub_category=natural|hybrid
 *
 * Multipart form-data:
 *   file: Excel file (.xlsx)
 *
 * Query:
 *   sub_category = "natural" | "hybrid"
 *
 * Excel columns (17 cols):
 *   SR.NO | ITEM NAME | Other Item Name | logx no | PHOTO | LENGTH | WEDTH | THICKNESS | process | ProcessColor | Series | PLAIN/Charactor | Pattarn | SHEET | Sq. mtr | cost | AMT
 *   Col 12 = PLAIN (grade) for NATURAL, Charactor (character) for HYBRID
 */
export const bulk_upload_grouping_done = catchAsync(async (req, res) => {
  const { sub_category } = req.query;
  const userDetails = req.userDetails;

  // Validate sub_category query param
  const allowed_sub_categories = ['natural', 'hybrid'];
  if (
    !sub_category ||
    !allowed_sub_categories.includes(sub_category.toLowerCase())
  ) {
    throw new ApiError(
      `sub_category query param is required and must be one of: ${allowed_sub_categories.join(', ')}`,
      StatusCodes.BAD_REQUEST
    );
  }
  const sub_category_upper = sub_category.toUpperCase();

  // Prepare upload directory
  const upload_dir = path.join(
    process.cwd(),
    'public',
    'upload',
    UPLOAD_DIR_RELATIVE
  );
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

  const session = await mongoose.startSession();
  let file_path = null;

  try {
    const { files } = await parse_form(req, form);
    const file = files.file?.[0];
    if (!file)
      throw new ApiError('Excel file is required', StatusCodes.BAD_REQUEST);
    file_path = file.filepath;

    // 1. Fetch Masters & Existing Groups for caching (BEFORE starting transaction)
    const [gradeA, itemNames, subCategories, series, characters, processes, colors, patterns, existingGroups] = await Promise.all([
        model('grade').findOne({ grade_name: 'A' }).lean(),
        model('item_name').find().lean(),
        model('item_subcategory').find().lean(),
        model('series_master').find().lean(),
        model('characters').find().lean(),
        model('process').find().lean(),
        model('colors').find().lean(),
        model('patterns').find().lean(),
        grouping_done_items_details_model.distinct('group_no')
      ]);

      if (!gradeA) {
        throw new ApiError('Grade "A" not found in masters', StatusCodes.BAD_REQUEST);
      }

      const caches = {
        itemNameMap: new Map(itemNames.map(i => [i.item_name.trim().toUpperCase(), i])),
        subCategoryMap: new Map(subCategories.map(s => [s.name.trim().toUpperCase(), s])),
        seriesMap: new Map(series.map(s => [s.series_name.trim().toUpperCase(), s])),
        characterMap: new Map(characters.map(c => [c.name.trim().toUpperCase(), c])),
        processMap: new Map(processes.map(p => [p.name.trim().toUpperCase(), p])),
        colorMap: new Map(colors.map(c => [c.name.trim().toUpperCase(), c])),
        patternMap: new Map(patterns.map(p => [p.name.trim().toUpperCase(), p])),
        existingGroupNoSet: new Set(existingGroups.map(g => String(g).trim().toUpperCase())),
      };

      session.startTransaction();

      try {
        // 2. Determine starting Pallet Number
      const maxPalletAgg = await grouping_done_items_details_model.aggregate([
        { 
          $match: { 
            remark: 'BULK_UPLOAD',
            pallet_number: { $exists: true, $ne: null, $regex: /^[0-9]+$/ } 
          } 
        },
        { $project: { pallet_num: { $toInt: '$pallet_number' } } },
        { $group: { _id: null, maxVal: { $max: '$pallet_num' } } }
      ]).session(session);

      let currentPalletCounter = maxPalletAgg.length > 0 ? maxPalletAgg[0].maxVal : 0;

      // Create header
      const header_doc = await grouping_done_details_model.create(
        [
          {
            grouping_done_date: new Date(),
            no_of_workers: 1,
            no_of_working_hours: 1,
            no_of_total_hours: 1,
            shift: 'DAY',
            remark: `BULK UPLOAD - ${sub_category_upper}`,
            created_by: userDetails._id,
            updated_by: userDetails._id,
          },
        ],
        { session }
      );

      const header = header_doc[0];
      const header_id = header._id;

      const workbook_reader = new exceljs.stream.xlsx.WorkbookReader(file_path, {
        entries: 'emit',
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        styles: 'ignore',
      });

      const BATCH_SIZE = 200;
      let buffer = [];
      let total_inserted = 0;
      const errors = [];
      const seenGroupNosInExcel = new Set();

      for await (const worksheet of workbook_reader) {
        let row_number = 0;
        for await (const row of worksheet) {
          row_number++;
          if (row_number === 1) continue;

          const col12_value = row.getCell(12).value;
          const raw = {
            item_name: row.getCell(2).value,
            logx_no: row.getCell(4).value,
            photo_no: row.getCell(5).value,
            length: row.getCell(6).value,
            width: row.getCell(7).value,
            thickness: row.getCell(8).value,
            process_name: row.getCell(9).value,
            process_color_name: row.getCell(10).value,
            series_name: row.getCell(11).value,
            grade_name: null,
            character_name: sub_category_upper === 'HYBRID' ? col12_value : null,
            pattern_name: row.getCell(13).value,
            no_of_sheets: row.getCell(14).value,
            sqm: (row.getCell(15).value && row.getCell(15).value.result) ? row.getCell(15).value.result : row.getCell(15).value,
            amount: (row.getCell(17).value && row.getCell(17).value.result) ? row.getCell(17).value.result : row.getCell(17).value,
          };

          const is_empty = Object.values(raw).every(v => v === null || v === undefined || v === '');
          if (is_empty) continue;

          // Local Excel Duplicate Check
          const logx_str = String(raw.logx_no || '').trim().toUpperCase();
          if (logx_str) {
            if (seenGroupNosInExcel.has(logx_str)) {
               errors.push({ row: row_number, message: `Duplicate Group No "${logx_str}" within Excel file` });
               break;
            }
            seenGroupNosInExcel.add(logx_str);
          }

          try {
            const resolved = await resolve_row(raw, sub_category_upper, caches, session);
            currentPalletCounter++;
            buffer.push({
              grouping_done_other_details_id: header_id,
              group_no: resolved.group_no,
              log_no_code: resolved.log_no_code,
              photo_no: resolved.photo_no,
              photo_no_id: resolved.photo_no_id,
              item_name: resolved.item_name,
              item_name_id: resolved.item_name_id,
              item_sub_category_id: resolved.item_sub_category_id,
              item_sub_category_name: resolved.item_sub_category_name,
              series_id: resolved.series_id,
              series_name: resolved.series_name,
              grade_id: gradeA._id,
              grade_name: gradeA.grade_name,
              character_id: resolved.character_id,
              character_name: resolved.character_name,
              process_id: resolved.process_id,
              process_name: resolved.process_name,
              color_id: resolved.color_id,
              color_name: resolved.color_name,
              pattern_id: resolved.pattern_id,
              pattern_name: resolved.pattern_name,
              length: resolved.length,
              width: resolved.width,
              thickness: resolved.thickness,
              no_of_sheets: resolved.no_of_sheets,
              sqm: resolved.sqm,
              amount: resolved.amount,
              available_details: {
                no_of_sheets: resolved.no_of_sheets,
                sqm: resolved.sqm,
                amount: resolved.amount,
              },
              pallet_number: currentPalletCounter.toString(),
              remark: 'BULK_UPLOAD',
              is_damaged: false,
              created_by: userDetails._id,
              updated_by: userDetails._id,
            });
          } catch (row_err) {
            errors.push({ row: row_number, message: row_err.message });
            break; // Stop immediately
          }

          if (buffer.length >= BATCH_SIZE) {
            await grouping_done_items_details_model.insertMany(buffer, { session });
            total_inserted += buffer.length;
            buffer = [];
          }
        }
        if (errors.length > 0) break;
      }

      // If any row-level errors, abort the whole transaction
      if (errors.length > 0) {
        await session.abortTransaction();
        // Clean up file
        if (file_path && fs.existsSync(file_path)) fs.unlinkSync(file_path);
        return res.status(StatusCodes.BAD_REQUEST).json(
          new ApiResponse(
            StatusCodes.BAD_REQUEST,
            'Bulk upload failed due to validation errors',
            { errors }
          )
        );
      }

      // Flush remaining buffer
      if (buffer.length > 0) {
        await grouping_done_items_details_model.insertMany(buffer, {
          session,
        });
        total_inserted += buffer.length;
      }

      await session.commitTransaction();

      // Clean up file
      if (file_path && fs.existsSync(file_path)) fs.unlinkSync(file_path);

      return res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          `Grouping Done bulk upload (${sub_category_upper}) completed successfully`,
          {
            grouping_done_header_id: header_id,
            total_items_inserted: total_inserted,
          }
        )
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    }
  } catch (err) {
    if (file_path && fs.existsSync(file_path)) fs.unlinkSync(file_path);
    throw err;
  } finally {
    await session.endSession();
  }
});
