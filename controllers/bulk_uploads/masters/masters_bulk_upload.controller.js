import mongoose, { model } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/ApiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';

const master_config_model = {
    polish_master: {
        model: 'polish',
        fields: ['name', 'code'],
        filepath: '/bulk_uploads/masters/polish_master/',
    },
    photo_master: {
        model: 'photos',
        fields: [
            'photo_number',
            'current_stage',
            'group_no',
            'item_name',
            'sub_category_type',
            'length',
            'width',
            'thickness',
            'no_of_sheets',
            'available_no_of_sheets',
            'timber_colour_name',
            'process_name',
            'character_name',
            'pattern_name',
            'series_name',
            'grade_name',
            'cut_name',
            'process_color_name',
            'value_added_process',
            'additional_character',
            'placement',
            'collection_name',
            'grain_direction',
            'type',
            'destination',
            'destination_pallet_no',
            'min_rate',
            'max_rate',
            'remark',
        ],
    },
    dispatch_address_master: {
        model: 'dispatchAddress',
        fields: ['address	', 'country', 'state', 'city', 'pincode	', 'gst_number'],
    },
    transport_master: {
        model: 'transporters',
        fields: ['name	', 'branch', 'area_of_operation', 'type', 'transport_id'],
    },
    color_master: {
        model: 'colors',
        fields: ['name', 'type', 'process_name'],
    },
    process_master: {
        model: 'process',
        fields: ['name', 'process_type'],
    },
    pattern_master: {
        model: 'patterns',
        fields: ['name'],
    },
    character_master: {
        model: 'characters',
        fields: ['name'],
    },
    department_master: {
        model: 'departments',
        fields: ['dept_name', 'remark'],
    },
    gst_master: {
        model: 'gsts',
        fields: ['gst_percentage', 'gst_remarks'],
    },
    expense_type_master: {
        model: 'expenseTypes',
        fields: ['expense_type_name', 'expense_type_remarks'],
    },
    series_master: {
        model: 'series_masters',
        fields: ['series_name', 'remark'],
    },
    cut_master: {
        model: 'cuts',
        fields: ['cut_name', 'cut_remarks'],
    },
    currency_master: {
        model: 'currencies',
        fields: ['currency_name', 'currency_remarks'],
    },
    grade_master: {
        model: 'grades',
        fields: ['grade_name', 'grade_remarks'],
    },
    unit_master: {
        model: 'unit',
        fields: ['unit_name', 'unit_symbolic_name', 'unit_gst_code'],
        filepath: '/bulk_uploads/masters/unit_master/',
    },
    thickness_master: {
        model: 'thickness',
        fields: ['thickness', 'category', 'remark'],
    },
    width_master: {
        model: 'width',
        fields: ['width', 'remark'],
    },
    length_master: {
        model: 'length',
        fields: ['length', 'remark'],
    },
    supplier_master: {
        model: 'supplier',
        fields: ['supplier_name', 'supplier_type', 'msme_type', 'msme_no'],
        filepath: '/bulk_uploads/masters/supplier_master/',
    },
    // Masters with lookups/dependencies - handled by switch case
    sub_category_master: {
        model: 'item_subcategory',
        fields: ['name', 'type', 'category', 'remark'],
        filepath: '/bulk_uploads/masters/sub_category_master/',
    },
    item_name_master: {
        model: 'item_name',
        fields: [
            'item_name',
            'item_name_code',
            'color_name',
            'category',
            'item_subcategory',
            'alternate_item_name_details',
        ],
        filepath: '/bulk_uploads/masters/item_name_master/',
    },
    supplier_branches_master: {
        model: 'supplier_branch',
        fields: [
            'supplier_name',
            'branch_name',
            'contact_person_name',
            'contact_person_email',
            'contact_person_mobile_number',
            'contact_person_designation',
            'address',
            'country',
            'state',
            'city',
            'pincode',
            'gst_number',
            'is_main_branch',
        ],
        filepath: '/bulk_uploads/masters/supplier_branches_master/',
    },
    category_master: {
        model: 'item_category',
        fields: [
            'category',
            'calculate_unit',
            'product_hsn_code',
            'gst_percentage',
        ],
        filepath: '/bulk_uploads/masters/category_master/',
    },
    machine_master: {
        model: 'machine',
        fields: ['machine_name', 'department'],
        filepath: '/bulk_uploads/masters/machine_master/',
    },
};

const parse_form = (req, form) => {
    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};

// Custom functions for masters with lookups/dependencies
async function subcategory_master(doc, session) {
    // Lookup category by name and get category_id
    if (doc.category) {
        const categoryDoc = await model('item_category')
            .findOne({ category: doc.category })
            .lean()
            .session(session);

        if (!categoryDoc) {
            throw new ApiError(
                `Invalid category "${doc.category}" - not found in item_categories`,
                StatusCodes.BAD_REQUEST
            );
        }

        // Replace category name with category_id
        doc.category = [categoryDoc._id];
    }

    return doc;
}

async function item_name_master(doc, session) {
    // Lookup color by name
    if (doc.color_name) {
        const colorDoc = await model('colors')
            .findOne({ name: doc.color_name })
            .lean()
            .session(session);

        if (!colorDoc) {
            throw new ApiError(
                `Invalid color "${doc.color_name}" - not found in colors`,
                StatusCodes.BAD_REQUEST
            );
        }

        // Store color info
        doc.color = {
            color_id: colorDoc._id,
            color_name: doc.color_name
        };
        delete doc.color_name; // Remove original field
    }

    // Lookup category by name
    if (doc.category) {
        const categoryDoc = await model('item_category')
            .findOne({ category: doc.category })
            .lean()
            .session(session);

        if (!categoryDoc) {
            throw new ApiError(
                `Invalid category "${doc.category}" - not found in item_categories`,
                StatusCodes.BAD_REQUEST
            );
        }

        doc.category = [categoryDoc._id];
    }

    // Lookup subcategory by name
    if (doc.item_subcategory) {
        const subcategoryDoc = await model('item_subcategory')
            .findOne({ name: doc.item_subcategory })
            .lean()
            .session(session);

        if (!subcategoryDoc) {
            throw new ApiError(
                `Invalid subcategory "${doc.item_subcategory}" - not found in item_subcategories`,
                StatusCodes.BAD_REQUEST
            );
        }

        doc.item_subcategory = [subcategoryDoc._id];
    }

    return doc;
}

async function supplier_branches_master(doc, session) {
    // Lookup supplier by name
    if (doc.supplier_name) {
        const supplierDoc = await model('supplier')
            .findOne({ supplier_name: doc.supplier_name })
            .lean()
            .session(session);

        if (!supplierDoc) {
            throw new ApiError(
                `Invalid supplier "${doc.supplier_name}" - not found in suppliers`,
                StatusCodes.BAD_REQUEST
            );
        }

        // Replace supplier_name with supplier_id
        doc.supplier_id = supplierDoc._id;
        delete doc.supplier_name;
    }

    // Handle contact person array
    if (doc.contact_person_name || doc.contact_person_email || doc.contact_person_mobile_number || doc.contact_person_designation) {
        const contactPersonData = {
            name: doc.contact_person_name || null,
            email: doc.contact_person_email || null,
            mobile_number: doc.contact_person_mobile_number || null,
            designation: doc.contact_person_designation || null
        };

        // Only add contact person if name is provided
        if (contactPersonData.name) {
            doc.contact_person = [contactPersonData];
        }

        // Remove individual contact person fields
        delete doc.contact_person_name;
        delete doc.contact_person_email;
        delete doc.contact_person_mobile_number;
        delete doc.contact_person_designation;
    }

    return doc;
}



async function machine_master(doc, session) {
    // Lookup department by name
    if (doc.department) {
        const departmentDoc = await model('department')
            .findOne({ dept_name: doc.department })
            .lean()
            .session(session);

        if (!departmentDoc) {
            throw new ApiError(
                `Invalid department "${doc.department}" - not found in departments`,
                StatusCodes.BAD_REQUEST
            );
        }

        // Replace department name with department_id
        doc.department = departmentDoc._id;
    }

    return doc;
}
export const bulk_upload_masters = catchAsync(async (req, res) => {
    const { master_name } = req.query;
    const user = req.userDetails;
    const configs = master_config_model[master_name];
    const upload_dir = path.join(process.cwd(), 'public', 'upload', configs?.filepath);

    if (!fs.existsSync(upload_dir)) {
        fs.mkdirSync(upload_dir, { recursive: true });
    }
    const form = formidable({
        uploadDir: upload_dir,
        allowEmptyFiles: false,
        multiples: false,
        keepExtensions: true,
        filename: (name, ext) => {
            return `${name}_${Date.now()}${ext}`;
        },
    });
    if (!master_name) {
        throw new ApiError('Master name is required', StatusCodes.BAD_REQUEST);
    }

    if (!master_config_model[master_name]) {
        throw new ApiError('Invalid master name', StatusCodes.BAD_REQUEST);
    };
    const session = await mongoose.startSession();
    let file_path = null;
    try {
        const { files } = await parse_form(req, form);
        const file = files.file?.[0];
        file_path = file?.filepath;
        if (!file) {
            throw new ApiError('File is required', StatusCodes.BAD_REQUEST);
        }

        const batch_size = 1000;
        let buffer_data = [];
        let total = 0;

        session.startTransaction();
        try {
            const workbook_reader = new exceljs.stream.xlsx.WorkbookReader(file.filepath, {
                entries: 'emit',
                sharedStrings: 'cache',
                hyperlinks: "ignore",
                styles: 'ignore',
            });
            const maxNumber = await model(configs?.model).aggregate([
                {
                    $group: {
                        _id: null,
                        max: { $max: '$sr_no' },
                    },
                },
            ]);

            let max_sr_no = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
            for await (const worksheet of workbook_reader) {

                for await (const row of worksheet) {
                    //here it will skip the header row..
                    if (row?.number === 1) continue;

                    let doc = { sr_no: max_sr_no++ };

                    for (let i = 0; i < configs?.fields?.length; i++) {
                        const excel_field = configs?.fields[i];
                        let raw_value = row.getCell(i + 1).value ?? null;
                        doc[excel_field] = raw_value
                    }

                    // Apply custom logic for masters with lookups
                    switch (master_name) {
                        case 'sub_category_master':
                            doc = await subcategory_master(doc, session);
                            break;
                        case 'item_name_master':
                            doc = await item_name_master(doc, session);
                            break;
                        case 'supplier_branches_master':
                            doc = await supplier_branches_master(doc, session);
                            break;
                        case 'machine_master':
                            doc = await machine_master(doc, session);
                            break;
                        default:
                            break;
                    }

                    if (["unit_master"]?.includes(master_name)) {
                        doc.created_employee_id = user?._id;
                    } else {
                        doc.created_by = user?._id
                    }
                    doc.updated_by = user?._id;
                    buffer_data?.push(doc);

                    if (buffer_data?.length >= batch_size) {
                        await model(configs?.model)?.insertMany(buffer_data, { session });
                        total += buffer_data?.length;
                        buffer_data = []
                    }
                }
            };

            if (buffer_data?.length > 0) {
                await model(configs?.model)?.insertMany(buffer_data, { session });
                total += buffer_data?.length;

            };

            const response = new ApiResponse(StatusCodes.OK, `${master_name?.split("_")?.join(" ")?.toUpperCase()} uploaded successfully`, total);
            await session.commitTransaction();
            return res.status(response.statusCode).json(response)
        } catch (error) {
            await session.abortTransaction();
            throw error
        }
    } catch (error) {
        if (file_path) {
            fs.unlinkSync(file_path);
        }
        throw error
    } finally {
        await session.endSession();
    }
});
