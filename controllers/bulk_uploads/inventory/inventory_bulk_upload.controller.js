import mongoose, { model } from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import { format_date, StatusCodes } from '../../../utils/constants.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import exceljs from 'exceljs';
import SupplierModel from '../../../database/schema/masters/supplier.schema.js';
import supplierBranchModel from '../../../database/schema/masters/supplier.branches.schema.js';
import moment from 'moment';

//utility to handle invoice fields
const invoice_fields = [
    'inward_sr_no',
    'inward_type',
    'inward_date',
    'currency',
    'workers_details.no_of_workers',
    'workers_details.shift',
    'workers_details.working_hours',
    'workers_details.total_hours',
    'supplier_name',
    'branch_name',
    'invoice_Details.invoice_date',
    'invoice_Details.invoice_no',
    'invoice_Details.total_item_amount',
    'invoice_Details.transporter_details',
    'invoice_Details.port_of_loading',
    'invoice_Details.port_of_discharge',
    'invoice_Details.bill_of_landing',
    'invoice_Details.isFreightInclude',
    'invoice_Details.freight',
    'invoice_Details.isLoadUnloadInclude',
    'invoice_Details.load_unload',
    'invoice_Details.isInsuranceInclude',
    'invoice_Details.insurance',
    'invoice_Details.isOtherInclude',
    'invoice_Details.other',
    'invoice_Details.other_for_import',
    'invoice_Details.gst_percentage',
    'invoice_Details.igst_percentage',
    'invoice_Details.sgst_percentage',
    'invoice_Details.cgst_percentage',
    'invoice_Details.gst_value',
    'invoice_Details.invoice_value_with_gst',
    'invoice_Details.remark',
];

//config model for different inventory types
const inventory_config_model = {
    log: {
        item_model: 'log_inventory_items_details',
        invoice_model: 'log_inventory_invoice_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'supplier_log_no',
            'item_sub_category_name',
            'item_name',
            'color_name',
            'log_no',
            'log_formula',
            'invoice_length',
            'invoice_diameter',
            'invoice_cmt',
            'indian_cmt',
            'physical_length',
            'physical_diameter',
            'physical_cmt',
            'exchange_rate',
            'rate_in_currency',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/log/',
        handler: add_log_inventory_details,
    },
    flitch: {
        invoice_model: 'flitch_inventory_invoice_details',
        item_model: 'flitch_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'supplier_flitch_no',
            'item_name',
            'color_name',
            'item_sub_category_name',
            'log_no',
            'flitch_code',
            'log_no_code',
            'flitch_formula',
            'length',
            'width1',
            'width2',
            'width3',
            'height',
            'flitch_cmt',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/flitch/',
        handler: add_flitch_inventory_details,
    },
    plywood: {
        invoice_model: 'plywood_inventory_invoice_details',
        item_model: 'plywood_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'item_name',
            'color_name',
            'item_sub_category_name',
            'plywood_type',
            'pallet_number',
            'length',
            'width',
            'thickness',
            'sheets',
            'total_sq_meter',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/plywood/',
        handler: add_plywood_inventory_details,
    },
    mdf: {
        invoice_model: 'mdf_inventory_invoice_details',
        item_model: 'mdf_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'item_name',
            'item_sub_category_name',
            'mdf_type',
            'pallet_number',
            'length',
            'width',
            'thickness',
            'no_of_sheet',
            'total_sq_meter',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/mdf/',
        handler: add_mdf_inventory_details,
    },
    face: {
        invoice_model: 'face_inventory_invoice_details',
        item_model: 'face_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'item_name',
            'length',
            'width',
            'thickness',
            'number_of_sheets',
            'total_sq_meter',
            'grade_name',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/face/',
        handler: add_face_inventory_details,
    },
    core: {
        invoice_model: 'core_inventory_invoice_details',
        item_model: 'core_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'item_name',
            'length',
            'width',
            'thickness',
            'number_of_sheets',
            'total_sq_meter',
            'grade_name',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/core/',
        handler: add_core_inventory_details,
    },
    fleece_paper: {
        invoice_model: 'fleece_inventory_invoice_details',
        item_model: 'fleece_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'item_name',
            'item_sub_category_name',
            'number_of_roll',
            'length',
            'width',
            'thickness',
            'total_length',
            'total_sq_meter',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/fleece_paper/',
        handler: add_fleece_paper_inventory_details,
    },
    other_goods: {
        invoice_model: 'othergoods_inventory_invoice_details',
        item_model: 'othergoods_inventory_items_details',
        fields: [
            'inward_sr_no',
            'supplier_item_name',
            'item_name',
            'item_sub_category_name',
            'department_name',
            'machine_name',
            'brand_name',
            'item_description',
            'total_quantity',
            'rate_in_currency',
            'exchange_rate',
            'rate_in_inr',
            'amount',
            'remark',
        ],
        filepath: '/bulk_uploads/inventory/other_goods/',
        handler: add_other_goods_inventory_details,
    },
};

//utility to parse form data
const parse_form = (req, form) => {
    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};

//utility to handle boolean values
const handle_boolean_values = (val) => {
    if (typeof val === 'string') {
        const normalized = val.trim().toLowerCase();
        return ['yes', 'true'].includes(normalized);
    }
    return Boolean(val);
};

//utility to handle nested values
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

//fetch master details by name
const fetch_supplier_details_by_name = async (name, session) => {
    const supplier_details = await SupplierModel.findOne({ supplier_name: name })
        .lean()
        .session(session);

    if (!supplier_details) {
        throw new ApiError(
            `Supplier not found -> ${name}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return supplier_details;
};
const fetch_supplier_branch_details_by_name = async (name, session) => {
    const supplier_branch_details = await supplierBranchModel
        .findOne({ branch_name: name })
        .lean()
        .session();

    if (!supplier_branch_details) {
        throw new ApiError(
            `Supplier Branch not found -> ${name}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return supplier_branch_details;
};
const fetch_subcategory_details_by_name = async (name, session) => {
    const subcategory_details = await model('item_subcategory')
        .findOne({ name: name })
        .lean()
        .session(session);
    if (!subcategory_details) {
        throw new ApiError(
            `Sub Category not found -> ${name}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return subcategory_details;
};
const fetch_item_details_by_name = async (name, session) => {
    const item_details = await model('item_name')
        .findOne({ item_name: name })
        .lean()
        .session(session);
    if (!item_details) {
        throw new ApiError(`Item not found -> ${name}`, StatusCodes.BAD_REQUEST);
    }
    return item_details;
};
const fetch_color_details_by_name = async (name, session) => {
    const color_details = await model('colors')
        .findOne({ name: name })
        .lean()
        .session(session);
    if (!color_details) {
        throw new ApiError(`Color not found -> ${name}`, StatusCodes.BAD_REQUEST);
    }
    return color_details;
};
const fetch_grade_details_by_name = async (name, session) => {
    const details = await model('grade')
        .findOne({ grade_name: name })
        .lean()
        .session(session);
    if (!details) {
        throw new ApiError(`Color not found -> ${name}`, StatusCodes.BAD_REQUEST);
    }
    return details;
};

const fetch_department_details_by_name = async (name, session) => {
    const details = await model('department')
        .findOne({ dept_name: name })
        .lean()
        .session(session);
    if (!details) {
        throw new ApiError(
            `Department not found -> ${name}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return details;
};
const fetch_machine_details_by_name = async (name, session) => {
    const details = await model('machine')
        .findOne({ machine_name: name })
        .lean()
        .session(session);
    if (!details) {
        throw new ApiError(`Machine not found -> ${name}`, StatusCodes.BAD_REQUEST);
    }
    return details;
};
//utility to add inventory invoice data
const add_inventory_invoice_data = async (doc, session) => {
    const invoice_data = {};
    // doc.inward_date = moment.parseZone(doc?.inward_date, 'DD/MM/YYYY').toDate();
doc.inward_date = format_date(doc?.inward_date);
    if (doc.workers_details) {
        invoice_data.workers_details = {
            no_of_workers: doc.workers_details.no_of_workers,
            shift: doc.workers_details.shift,
            working_hours: doc.workers_details.working_hours,
            total_hours: doc.workers_details.total_hours,
        };
    }

    let supplier_data = {};
    if (doc.supplier_name) {
        const supplier_details = await fetch_supplier_details_by_name(
            doc.supplier_name,
            session
        );
        const branch_details = await fetch_supplier_branch_details_by_name(
            doc.branch_name,
            session
        );

        supplier_data = {
            company_details: {
                supplier_company_id: supplier_details?._id,
                supplier_name: supplier_details?.supplier_name,
                supplier_type: supplier_details?.supplier_type,
            },
            branch_detail: {
                branch_id: branch_details?._id,
                branch_name: branch_details?.branch_name,
                contact_person: branch_details?.contact_person,
                address: branch_details?.address,
                state: branch_details?.state,
                city: branch_details?.city,
                country: branch_details?.country,
                pincode: branch_details?.pincode,
                gst_number: branch_details?.gst_number,
                web_url: branch_details?.web_url,
            },
        };
    }
    invoice_data.supplier_details = supplier_data;

    if (doc.invoice_Details) {
        invoice_data.invoice_Details = { ...doc.invoice_Details };

        // let updated_invoice_date = moment
        //     .parseZone(doc.invoice_Details.invoice_date, 'DD/MM/YYYY')
        //     .toDate();
        let updated_invoice_date = format_date(doc.invoice_Details.invoice_date)

        invoice_data.invoice_Details.invoice_date = updated_invoice_date;
        for (let field of [
            'isFreightInclude',
            'isLoadUnloadInclude',
            'isInsuranceInclude',
            'isOtherInclude',
        ]) {
            if (
                invoice_data.invoice_Details &&
                invoice_data.invoice_Details[field] !== undefined
            ) {
                invoice_data.invoice_Details[field] = handle_boolean_values(
                    invoice_data.invoice_Details[field]
                );
            }
        }
    }
    for (let key of Object.keys(doc)) {
        if (
            ![
                'workers_details',
                'supplier_name',
                'branch_name',
                'invoice_Details',
            ].includes(key)
        ) {
            invoice_data[key] = doc[key];
        }
    }
    return invoice_data;
};

//utility to add inventory details based on inventory type
async function add_log_inventory_details(doc, session, sr_no_set) {
    const subcategory_details = await fetch_subcategory_details_by_name(
        doc.item_sub_category_name,
        session
    );
    const item_details = await fetch_item_details_by_name(doc.item_name, session);
    const color_details = await fetch_color_details_by_name(
        doc.color_name,
        session
    );

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.item_sub_category_id = subcategory_details?._id;
    doc.item_sub_category_name = subcategory_details?.name;
    doc.color = {
        color_id: color_details?._id,
        color_name: color_details?.name,
    };

    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_flitch_inventory_details(doc, session, sr_no_set) {
    const subcategory_details = await fetch_subcategory_details_by_name(
        doc.item_sub_category_name,
        session
    );
    const item_details = await fetch_item_details_by_name(doc.item_name, session);
    const color_details = await fetch_color_details_by_name(
        doc.color_name,
        session
    );

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.item_sub_category_id = subcategory_details?._id;
    doc.item_sub_category_name = subcategory_details?.name;
    doc.color = {
        color_id: color_details?._id,
        color_name: color_details?.name,
    };
    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_plywood_inventory_details(doc, session, sr_no_set) {
    const subcategory_details = await fetch_subcategory_details_by_name(
        doc.item_sub_category_name,
        session
    );
    const item_details = await fetch_item_details_by_name(doc.item_name, session);
    const color_details = await fetch_color_details_by_name(
        doc.color_name,
        session
    );

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.item_sub_category_id = subcategory_details?._id;
    doc.item_sub_category_name = subcategory_details?.name;
    doc.color = {
        color_id: color_details?._id,
        color_name: color_details?.name,
    };
    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_mdf_inventory_details(doc, session, sr_no_set) {
    const subcategory_details = await fetch_subcategory_details_by_name(
        doc.item_sub_category_name,
        session
    );
    const item_details = await fetch_item_details_by_name(doc.item_name, session);

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.item_sub_category_id = subcategory_details?._id;
    doc.item_sub_category_name = subcategory_details?.name;

    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_face_inventory_details(doc, session, sr_no_set) {
    const item_details = await fetch_item_details_by_name(doc.item_name, session);
    const grade_details = await fetch_grade_details_by_name(
        doc.grade_name,
        session
    );

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.grade_id = grade_details?._id;
    doc.grade_name = grade_details?.grade_name;
    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_core_inventory_details(doc, session, sr_no_set) {
    const item_details = await fetch_item_details_by_name(doc.item_name, session);
    const grade_details = await fetch_grade_details_by_name(
        doc.grade_name,
        session
    );

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.grade_id = grade_details?._id;
    doc.grade_name = grade_details?.grade_name;
    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_fleece_paper_inventory_details(doc, session, sr_no_set) {
    const subcategory_details = await fetch_subcategory_details_by_name(
        doc.item_sub_category_name,
        session
    );
    const item_details = await fetch_item_details_by_name(doc.item_name, session);

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.item_sub_category_id = subcategory_details?._id;
    doc.item_sub_category_name = subcategory_details?.name;

    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}
async function add_other_goods_inventory_details(doc, session, sr_no_set) {
    const subcategory_details = await fetch_subcategory_details_by_name(
        doc.item_sub_category_name,
        session
    );
    const item_details = await fetch_item_details_by_name(doc.item_name, session);
    const machine_details = await fetch_machine_details_by_name(
        doc.machine_name,
        session
    );
    const department_details = await fetch_department_details_by_name(
        doc.department_name,
        session
    );

    doc.item_name = item_details?.item_name;
    doc.item_id = item_details?._id;
    doc.item_sub_category_id = subcategory_details?._id;
    doc.item_sub_category_name = subcategory_details?.name;
    doc.department_name = department_details?.dept_name;
    doc.department_id = department_details?._id;
    doc.machine_name = machine_details?.machine_name;
    doc.machine_id = machine_details?._id;

    doc.invoice_id = sr_no_set.get(doc.inward_sr_no);

    if (!doc.inward_sr_no) {
        throw new ApiError(
            `Inward SR No not found -> ${doc.inward_sr_no}`,
            StatusCodes.BAD_REQUEST
        );
    }
    return doc;
}

export const bulk_upload_inventory = catchAsync(async (req, res) => {
    const { inventory_name } = req.query;
    const user = req.userDetails;
    const configs = inventory_config_model[inventory_name];
    const inward_sr_no_set = new Map();
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
    if (!inventory_name) {
        throw new ApiError('Inventory name is required', StatusCodes.BAD_REQUEST);
    }

    if (!inventory_config_model[inventory_name]) {
        throw new ApiError('Invalid Inventory name', StatusCodes.BAD_REQUEST);
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
        let invoice_buffer_data = [];
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

            const maxNumber = await model(configs?.item_model).aggregate([
                {
                    $group: {
                        _id: null,
                        max: { $max: '$item_sr_no' },
                    },
                },
            ]);

            let max_sr_no = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
            for await (const worksheet of workbook_reader) {
                //handle invoice details
                if (worksheet?.name === 'Invoice Details') {
                    for await (const row of worksheet) {
                        if (row.number === 1) continue;
                        let invoice_doc = {};
                        invoice_fields.forEach((field, index) => {
                            let raw_value = row.getCell(index + 1).value ?? null;
                            handle_nested_values(invoice_doc, field, raw_value);
                        });
                        const invoice_Details = await add_inventory_invoice_data(
                            invoice_doc,
                            session
                        );

                        invoice_buffer_data.push({
                            ...invoice_Details,
                            created_by: user?._id,
                            updated_by: user?._id,
                        });
                        if (invoice_buffer_data?.length === batch_size) {
                            const create_invoice_result = await model(
                                configs?.invoice_model
                            ).insertMany(invoice_buffer_data, { session });
                            if (create_invoice_result?.length === 0) {
                                throw new ApiError(
                                    'Failed to add invoice details',
                                    StatusCodes.BAD_REQUEST
                                );
                            }
                            // console.log("create_invoice_result => ", create_invoice_result)
                            create_invoice_result?.forEach((inv) => {
                                inward_sr_no_set.set(inv?.inward_sr_no, inv?._id);
                            });
                            invoice_buffer_data = [];
                        }
                    }
                    if (invoice_buffer_data?.length > 0) {
                        const create_invoice_result = await model(
                            configs?.invoice_model
                        ).insertMany(invoice_buffer_data, { session });
                        if (create_invoice_result?.length === 0) {
                            throw new ApiError(
                                'Failed to add invoice details',
                                StatusCodes.BAD_REQUEST
                            );
                        }
                        create_invoice_result?.forEach((inv) => {
                            inward_sr_no_set.set(inv?.inward_sr_no, inv?._id);
                        });
                        invoice_buffer_data = [];
                    }
                }
            }

            for await (const worksheet of workbook_reader) {
                //handle item details
                if (worksheet?.name === 'Invoice Item Details') {
                    for await (const row of worksheet) {
                        if (row.number === 1) continue;
                        let item_doc = { item_sr_no: max_sr_no++ };

                        configs?.fields.forEach((field, index) => {
                            let raw_value = row.getCell(index + 1).value ?? null;
                            item_doc[field] = raw_value;
                        });

                        //here each config will have its own handler to handle item details
                        await configs?.handler(item_doc, session, inward_sr_no_set);

                        item_doc.created_by = user?._id;
                        item_doc.updated_by = user?._id;
                        buffer_data.push(item_doc);

                        //insert in batches
                        if (buffer_data.length === batch_size) {
                            await model(configs?.item_model).insertMany(buffer_data, {
                                session,
                            });
                            total += buffer_data.length;
                            buffer_data = [];
                        }
                    }
                }
                //if any buffer data is left to be inserted
                if (buffer_data?.length > 0) {
                    await model(configs?.item_model)?.insertMany(buffer_data, {
                        session,
                    });
                    total += buffer_data?.length;
                }
            }
            const response = new ApiResponse(
                StatusCodes.OK,
                `${inventory_name?.split('_')?.join(' ')?.toUpperCase()} uploaded successfully`,
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
