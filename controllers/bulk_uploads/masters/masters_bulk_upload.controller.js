import mongoose, { model } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';
import moment from 'moment';

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
            'sales_item_name',
            'remark',
        ],
        filepath: '/bulk_uploads/masters/photo_master/',
    },
    dispatch_address_master: {
        model: 'dispatchAddress',
        fields: ['address', 'country', 'state', 'city', 'pincode', 'gst_number'],
        filepath: '/bulk_uploads/masters/dispatch_address_master/',
    },
    transport_master: {
        model: 'transporters',
        fields: ['name', 'branch', 'area_of_operation', 'type', 'transport_id'],
        filepath: '/bulk_uploads/masters/transport_master/',
    },
    color_master: {
        model: 'colors',
        fields: ['name', 'type', 'process_name'],
    },
    process_master: {
        model: 'process',
        fields: ['name', 'process_type'],
        filepath: '/bulk_uploads/masters/process_master/',
    },
    pattern_master: {
        model: 'patterns',
        fields: ['name'],
        filepath: '/bulk_uploads/masters/pattern_master/',
    },
    character_master: {
        model: 'character',
        fields: ['name'],
        filepath: '/bulk_uploads/masters/character_master/',
    },
    department_master: {
        model: 'department',
        fields: ['dept_name', 'remark'],
        filepath: '/bulk_uploads/masters/department_master/',
    },
    gst_master: {
        model: 'gst',
        fields: ['gst_percentage', 'gst_remarks'],
        filepath: '/bulk_uploads/masters/gst_master/',
    },
    expense_type_master: {
        model: 'expense_type',
        fields: ['expense_type_name', 'expense_type_remarks'],
        filepath: '/bulk_uploads/masters/expense_type_master/',
    },
    series_master: {
        model: 'series_master',
        fields: ['series_name', 'remark'],
        filepath: '/bulk_uploads/masters/series_master/',
    },
    cut_master: {
        model: 'cut',
        fields: ['cut_name', 'cut_remarks'],
        filepath: '/bulk_uploads/masters/cut_master/',
    },
    character_master: {
        model: 'characters',
        fields: ['name'],
        filepath: '/bulk_uploads/masters/character_master/',
    },
    currency_master: {
        model: 'currency',
        fields: ['currency_name', 'currency_remarks'],
        filepath: '/bulk_uploads/masters/currency_master/',
    },
    grade_master: {
        model: 'grade',
        fields: ['grade_name', 'grade_remarks'],
        filepath: '/bulk_uploads/masters/grade_master/',
    },
    unit_master: {
        model: 'unit',
        fields: ['unit_name', 'unit_symbolic_name', 'unit_gst_code'],
        filepath: '/bulk_uploads/masters/unit_master/',
    },
    thickness_master: {
        model: 'thickness',
        fields: ['thickness', 'category', 'remark'],
        filepath: '/bulk_uploads/masters/thickness_master/',
    },
    width_master: {
        model: 'width',
        fields: ['width', 'remark'],
        filepath: '/bulk_uploads/masters/width_master/',
    },
    length_master: {
        model: 'length',
        fields: ['length', 'remark'],
        filepath: '/bulk_uploads/masters/length_master/',
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
    color_master: {
        model: 'colors',
        fields: ['process_name', 'type', 'name'],
        filepath: '/bulk_uploads/masters/color_master/',
    },
    customer_master: {
        model: 'customers',
        fields: [
            'company_name',
            'customer_type',
            'owner_name',
            'supplier_type',
            'dob',
            'email_id',
            'web_url',
            'gst_number',
            'pan_number',
            'legal_name',
            'preferable_transport_for_part_load',
            'is_tcs_applicable',
            'is_insurance_applicable',
            'branding_type',
            'credit_schedule',
            'freight',
            'local_freight',
            'remark',
        ],
        filepath: '/bulk_uploads/masters/customer_master/',
    },
    machine_master: {
        model: 'machine',
        fields: ['machine_name', 'department'],
        filepath: '/bulk_uploads/masters/machine_master/',
    }
};


const parse_form = (req, form) => {
    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};

const build_address = (prefix, doc) => {
    return {
        address: doc[`${prefix}_address`] || null,
        country: doc[`${prefix}_country`] || null,
        state: doc[`${prefix}_state`] || null,
        city: doc[`${prefix}_city`] || null,
        pincode: doc[`${prefix}_pincode`] || null,
    };
};

// async function subcategory_master(doc, session) {
//     // Lookup category by name and get category_id
//     if (doc.category) {
//         const categoryDoc = await model('item_category')
//             .findOne({ category: doc.category })
//             .lean()
//             .session(session);

//         if (!categoryDoc) {
//             throw new ApiError(
//                 `Invalid category "${doc.category}" - not found in item_categories`,
//                 StatusCodes.BAD_REQUEST
//             );
//         }

//         // Replace category name with category_id
//         doc.category = [categoryDoc._id];
//     }

//     return doc;
// }

// async function item_name_master(doc, session) {
//     // Lookup color by name
//     if (doc.color_name) {
//         const colorDoc = await model('colors')
//             .findOne({ name: doc.color_name })
//             .lean()
//             .session(session);

//         if (!colorDoc) {
//             throw new ApiError(
//                 `Invalid color "${doc.color_name}" - not found in colors`,
//                 StatusCodes.BAD_REQUEST
//             );
//         }

//         // Store color info
//         doc.color = {
//             color_id: colorDoc._id,
//             color_name: doc.color_name,
//         };
//         delete doc.color_name; // Remove original field
//     }

//     // Lookup category by name
//     if (doc.category) {
//         const categoryDoc = await model('item_category')
//             .findOne({ category: doc.category })
//             .lean()
//             .session(session);

//         if (!categoryDoc) {
//             throw new ApiError(
//                 `Invalid category "${doc.category}" - not found in item_categories`,
//                 StatusCodes.BAD_REQUEST
//             );
//         }

//         doc.category = [categoryDoc._id];
//     }

//     // Lookup subcategory by name
//     if (doc.item_subcategory) {
//         const subcategoryDoc = await model('item_subcategory')
//             .findOne({ name: doc.item_subcategory })
//             .lean()
//             .session(session);

//         if (!subcategoryDoc) {
//             throw new ApiError(
//                 `Invalid subcategory "${doc.item_subcategory}" - not found in item_subcategories`,
//                 StatusCodes.BAD_REQUEST
//             );
//         }

//         doc.item_subcategory = [subcategoryDoc._id];
//     }

//     return doc;
// }

async function subcategory_master(doc, session) {


    if (doc.category) {
        const categoryNames = doc.category.split(',').map(cat => cat.trim());
        const categoryIds = [];

        for (const categoryName of categoryNames) {
            const categoryDoc = await model('item_category')
                .findOne({ category: categoryName })
                .lean()
                .session(session);

            if (!categoryDoc) {
                throw new ApiError(
                    `Invalid category "${categoryName}" - not found in item_categories`,
                    StatusCodes.BAD_REQUEST
                );
            }

            categoryIds.push(categoryDoc._id);
        }


        doc.category = categoryIds;
    }

    return doc;
}

async function item_name_master(doc, session) {

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


        doc.color = {
            color_id: colorDoc._id,
            color_name: doc.color_name,
        };
        delete doc.color_name;
    }


    if (doc.category) {
        const categoryNames = doc.category.split(',').map(cat => cat.trim());
        const categoryIds = [];

        for (const categoryName of categoryNames) {
            const categoryDoc = await model('item_category')
                .findOne({ category: categoryName })
                .lean()
                .session(session);

            if (!categoryDoc) {
                throw new ApiError(
                    `Invalid category "${categoryName}" - not found in item_categories`,
                    StatusCodes.BAD_REQUEST
                );
            }

            categoryIds.push(categoryDoc._id);
        }

        doc.category = categoryIds;
    }


    if (doc.item_subcategory) {
        const subcategoryNames = doc.item_subcategory.split(',').map(sub => sub.trim());
        const subcategoryIds = [];

        for (const subcategoryName of subcategoryNames) {
            const subcategoryDoc = await model('item_subcategory')
                .findOne({ name: subcategoryName })
                .lean()
                .session(session);

            if (!subcategoryDoc) {
                throw new ApiError(
                    `Invalid subcategory "${subcategoryName}" - not found in item_subcategories`,
                    StatusCodes.BAD_REQUEST
                );
            }

            subcategoryIds.push(subcategoryDoc._id);
        }

        doc.item_subcategory = subcategoryIds;
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
    if (
        doc.contact_person_name ||
        doc.contact_person_email ||
        doc.contact_person_mobile_number ||
        doc.contact_person_designation
    ) {
        const contactPersonData = {
            name: doc.contact_person_name || null,
            email: doc.contact_person_email || null,
            mobile_number: doc.contact_person_mobile_number || null,
            designation: doc.contact_person_designation || null,
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
async function color_master(doc, session) {
    if (doc?.process_name) {
        const proccess_doc = await model('process')
            .findOne({ name: doc?.process_name })
            .lean()
            .session(session);

        if (!proccess_doc) {
            throw new ApiError(
                `Invalid Process "${doc.process_name}" - not found in Processes`,
                StatusCodes.BAD_REQUEST
            );
        }

        // Replace department name with department_id
        doc.process_id = proccess_doc._id;
        doc.process_name = proccess_doc.name;
    }

    return doc;
}
async function customer_master(doc, session) {
    if (doc?.preferable_transport_for_part_load) {
        const transporter_doc = await model('transporters')
            .findOne({ name: doc.preferable_transport_for_part_load })
            .lean()
            .session(session);

        if (!transporter_doc) {
            throw new ApiError(
                `Invalid Transporter "${doc.preferable_transport_for_part_load}" - not found in transporters`,
                StatusCodes.BAD_REQUEST
            );
        }
        doc.preferable_transport_for_part_load = transporter_doc._id;
        doc.dob = moment.parseZone(doc?.dob, 'DD/MM/YYYY').toDate();
    }
    doc.photo_type = {
        photo_type_a: doc?.photo_type_a ?? null,
        photo_type_b: doc?.photo_type_b ?? null,
        photo_type_c: doc?.photo_type_c ?? null,
    };

    doc.address = {
        billing_address: build_address('billing', doc),
        delivery_address: build_address('delivery', doc),
        alternate_delivery_address: build_address('alternate_delivery', doc),
        communication_address: build_address('communication', doc),
    };

    return doc;
}


//using switch case
// async function photo_master(doc, session) {
//     let value_added_processes, additonal_charcters = [];

//     switch (doc) {
//         case doc?.group_no:
//             const group_doc = await model('grouping_done_items_details').findOne({ grouping_done_items_details: doc?.group_no }).session(session);

//             if (!group_doc) {
//                 throw new ApiError(`${doc?.group_no} not found.`, StatusCodes.NOT_FOUND)
//             };

//             doc.group_id = group_doc?._id
//             break;
//         case doc?.item_name:
//             const item = await model('item_name').findOne({ item_name: doc?.item_name }).session(session);
//             if (!item) {
//                 throw new ApiError(`${doc?.item_name} not found.`, StatusCodes.NOT_FOUND)
//             };

//             doc.item_name_id = item?._id
//             doc.item_name = item?.item_name;
//             break;

//         case doc?.timber_colour_name:
//             const color = await model('colors').findOne({ name: doc?.timber_colour_name }).session(session);

//             if (!color) {
//                 throw new ApiError(`${doc?.timber_colour_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.timber_colour_id = color?._id;
//             doc.timber_colour_name = color.name
//             break;

//         case doc?.process_name:
//             const process = await model('process').findOne({ name: doc?.process_name }).session(session);

//             if (!process) {
//                 throw new ApiError(`${doc?.process_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.process_id = process?._id;
//             doc.process_name = process.name
//             break;
//         case doc?.grade_name:
//             const grade = await model('grade').findOne({ grade_name: doc?.grade_name }).session(session);

//             if (!grade) {
//                 throw new ApiError(`${doc?.grade_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.grade_id = grade?._id;
//             doc.grade_name = grade.grade_name
//             break;
//         case doc?.series_name:
//             const series = await model('series_master').findOne({ series_name: doc?.series_name }).session(session);

//             if (!series) {
//                 throw new ApiError(`${doc?.series_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.series_id = series?._id;
//             doc.series_name = series.series_name
//             break;
//         case doc?.pattern_name:
//             const pattern = await model('patterns').findOne({ name: doc?.pattern_name }).session(session);

//             if (!pattern) {
//                 throw new ApiError(`${doc?.pattern_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.pattern_id = pattern?._id;
//             doc.pattern_name = pattern.name
//             break;
//         case doc?.character_name:
//             const character = await model('characters').findOne({ name: doc?.character_name }).session(session);

//             if (!character) {
//                 throw new ApiError(`${doc?.character_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.character_id = character?._id;
//             doc.character_name = character.name
//             break;
//         case doc?.cut_name:
//             const cut = await model('cuts').findOne({ cut_name: doc?.cut_name }).session(session);

//             if (!cut) {
//                 throw new ApiError(`${doc?.cut_name} not found.`, StatusCodes.NOT_FOUND)
//             };
//             doc.cut_id = cut?._id;
//             doc.cut_name = cut.name
//             break;

//         case doc?.value_added_process:
//             const value_added_process = await model('process').findOne({ name: doc?.value_added_process }).session(session);

//             if (!value_added_process) {
//                 throw new ApiError(`${doc?.value_added_process} not found.`, StatusCodes.NOT_FOUND)
//             };
//             value_added_processes.push({
//                 process_id: value_added_process?._id,
//                 process_name: value_added_process.name
//             });
//             doc.value_added_process = value_added_processes;

//             break;
//         case doc?.additional_character:
//             const additional_character_doc = await model('characters').findOne({ name: doc?.additional_character }).session(session);

//             if (!additional_character_doc) {
//                 throw new ApiError(`${doc?.additional_character} not found.`, StatusCodes.NOT_FOUND)
//             };
//             additonal_charcters.push({
//                 type: additional_character_doc?._id,
//                 character_name: additional_character_doc?.name
//             })
//             doc.additional_character = additonal_charcters
//             break;

//         default:
//             break;
//     }
//     console.log("doc in photo master", doc)
//     return doc;
// }

//here it is dyanmic and created using field map

async function photo_master(doc, session) {
    const value_added_processes = [];
    const additional_characters = [];

    const fieldMap = [
        {
            key: 'group_no',
            model: 'grouping_done_items_details',
            queryField: 'group_no',
            assignId: 'group_id',
            assignName: null,
        },
        {
            key: 'item_name',
            model: 'item_name',
            queryField: 'item_name',
            assignId: 'item_name_id',
            assignName: 'item_name',
        },
        {
            key: 'timber_colour_name',
            model: 'colors',
            queryField: 'name',
            assignId: 'timber_colour_id',
            assignName: 'timber_colour_name',
        },
        {
            key: 'process_name',
            model: 'process',
            queryField: 'name',
            assignId: 'process_id',
            assignName: 'process_name',
        },
        {
            key: 'grade_name',
            model: 'grade',
            queryField: 'grade_name',
            assignId: 'grade_id',
            assignName: 'grade_name',
        },
        {
            key: 'series_name',
            model: 'series_master',
            queryField: 'series_name',
            assignId: 'series_id',
            assignName: 'series_name',
        },
        {
            key: 'pattern_name',
            model: 'patterns',
            queryField: 'name',
            assignId: 'pattern_id',
            assignName: 'pattern_name',
        },
        {
            key: 'character_name',
            model: 'characters',
            queryField: 'name',
            assignId: 'character_id',
            assignName: 'character_name',
        },
        {
            key: 'cut_name',
            model: 'cut',
            queryField: 'cut_name',
            assignId: 'cut_id',
            assignName: 'cut_name',
        },
        {
            key: 'value_added_process',
            model: 'process',
            queryField: 'name',
            assignArray: value_added_processes,
            arrayId: 'process_id',
            arrayName: 'process_name',
        },
        {
            key: 'additional_character',
            model: 'characters',
            queryField: 'name',
            assignArray: additional_characters,
            arrayId: 'character_id',
            arrayName: 'character_name',
        },
    ];

    for (const field of fieldMap) {
        if (doc[field.key]) {
            const found = await model(field.model)
                .findOne({ [field.queryField]: doc[field.key] })
                .session(session);

            if (!found) {
                throw new ApiError(
                    `${doc[field.key]} not found in ${field.model}`,
                    StatusCodes.NOT_FOUND
                );
            }

            if (field.assignArray) {
                field.assignArray.push({
                    [field.arrayId]: found._id,
                    [field.arrayName]: found[field.assignName || field.queryField],
                });
                doc[field.key] = field.assignArray;
            } else {
                doc[field.assignId] = found?._id;
                // if (field.assignName)
                //     doc[field.assignName] = found[field.assignName || field.queryField];
            }
        }
    }
    return doc;
}

export const bulk_upload_masters = catchAsync(async (req, res) => {
    const { master_name } = req.query;
    const user = req.userDetails;
    const configs = master_config_model[master_name];
    const upload_dir = path.join(
        process.cwd(),
        'public',
        'upload',
        configs?.filepath
    );

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
    }
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
            const workbook_reader = new exceljs.stream.xlsx.WorkbookReader(
                file.filepath,
                {
                    entries: 'emit',
                    sharedStrings: 'cache',
                    hyperlinks: 'ignore',
                    styles: 'ignore',
                }
            );
            const maxNumber = await model(configs?.model)
                .aggregate([
                    {
                        $group: {
                            _id: null,
                            max: { $max: '$sr_no' },
                        },
                    },
                ])
                .session(session);

            let max_sr_no = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
            for await (const worksheet of workbook_reader) {
                for await (const row of worksheet) {
                    if (row?.number === 1) continue;

                    let doc = { sr_no: max_sr_no++ };

                    for (let i = 0; i < configs?.fields?.length; i++) {
                        const excel_field = configs?.fields[i];
                        let raw_value = row.getCell(i + 1).value ?? null;
                        doc[excel_field] = raw_value;
                    }
                    const is_empty = Object.values(doc)
                        .filter((v, i) => i > 0)
                        .every(v => v === null || v === undefined || v === '');
                    if (is_empty) continue;

                    console.log("doc file fields => ", doc)

                    switch (master_name) {
                        // case 'category_master':
                        //     doc = await category_master(doc, session);
                        //     break;
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
                        case 'customer_master':
                            doc = await customer_master(doc, session);
                            console.log("doc in customer master", doc)
                            break;
                        case 'color_master':
                            doc = await color_master(doc, session);
                            break;
                        case 'photo_master':
                            doc = await photo_master(doc, session);
                            break;
                        default:
                            break;
                    }

                    if (
                        [
                            'unit_master',
                            'grade_master',
                            'currency_master',
                            'cut_master',
                            'expense_type_master',
                            'gst_master',
                            'department_master',
                        ]?.includes(master_name)
                    ) {
                        doc.created_employee_id = user?._id;
                    } else {
                        doc.created_by = user?._id;
                    }
                    doc.updated_by = user?._id;
                    buffer_data?.push(doc);

                    if (buffer_data?.length >= batch_size) {
                        await model(configs?.model)?.insertMany(buffer_data, { session });
                        total += buffer_data?.length;
                        buffer_data = [];
                    }
                }
            }

            if (buffer_data?.length > 0) {
                await model(configs?.model)?.insertMany(buffer_data, { session });
                total += buffer_data?.length;
            }

            const response = new ApiResponse(
                StatusCodes.OK,
                `${master_name?.split('_')?.join(' ')?.toUpperCase()} uploaded successfully`,
                total
            );
            await session.commitTransaction();
            return res.status(response.statusCode).json(response);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        }
    } catch (error) {
        if (file_path) {
            fs.unlinkSync(file_path);
        }
        throw error;
    } finally {
        await session.endSession();
    }
});
