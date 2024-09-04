import mongoose from "mongoose";
import LogSchemaFunction from "./LogsSchema/logs.schema.js";

const RoleSchema = new mongoose.Schema({
  role_name: {
    type: String,
    minlength: 2,
    maxlength: 25,
    required: [true, "Role name is required."],
    unique: [true, "Role name already exist."],
    trim: true,
  },
  permissions: {
    user_create: { type: Boolean, default: false },
    user_edit: { type: Boolean, default: false },
    user_view: { type: Boolean, default: false },

    role_create: { type: Boolean, default: false },
    role_edit: { type: Boolean, default: false },
    role_view: { type: Boolean, default: false },

    // master permissions
    supplier_master_create: { type: Boolean, default: false },
    supplier_master_edit: { type: Boolean, default: false },
    supplier_master_view: { type: Boolean, default: false },

    item_category_master_view: { type: Boolean, default: false },
    item_category_master_edit: { type: Boolean, default: false },
    item_category_master_create: { type: Boolean, default: false },

    item_sub_category_master_view: { type: Boolean, default: false },
    item_sub_category_master_edit: { type: Boolean, default: false },
    item_sub_category_master_create: { type: Boolean, default: false },

    item_name_master_create: { type: Boolean, default: false },
    item_name_master_edit: { type: Boolean, default: false },
    item_name_master_view: { type: Boolean, default: false },

    unit_master_create: { type: Boolean, default: false },
    unit_master_edit: { type: Boolean, default: false },
    unit_master_view: { type: Boolean, default: false },

    grade_master_create: { type: Boolean, default: false },
    grade_master_edit: { type: Boolean, default: false },
    grade_master_view: { type: Boolean, default: false },

    currency_master_view: { type: Boolean, default: false },
    currency_master_edit: { type: Boolean, default: false },
    currency_master_create: { type: Boolean, default: false },

    cut_master_view: { type: Boolean, default: false },
    cut_master_edit: { type: Boolean, default: false },
    cut_master_create: { type: Boolean, default: false },

    series_master_view: { type: Boolean, default: false },
    series_master_edit: { type: Boolean, default: false },
    series_master_create: { type: Boolean, default: false },

    expense_type_master_view: { type: Boolean, default: false },
    expense_type_master_edit: { type: Boolean, default: false },
    expense_type_master_create: { type: Boolean, default: false },

    expense_master_view: { type: Boolean, default: false },
    expense_master_edit: { type: Boolean, default: false },
    expense_master_create: { type: Boolean, default: false },

    gst_master_view: { type: Boolean, default: false },
    gst_master_edit: { type: Boolean, default: false },
    gst_master_create: { type: Boolean, default: false },

    department_master_view: { type: Boolean, default: false },
    department_master_edit: { type: Boolean, default: false },
    department_master_create: { type: Boolean, default: false },

    machine_master_view: { type: Boolean, default: false },
    machine_master_edit: { type: Boolean, default: false },
    machine_master_create: { type: Boolean, default: false },

    // inventory permissions
    log_inventory_view: { type: Boolean, default: false },
    log_inventory_edit: { type: Boolean, default: false },
    log_inventory_create: { type: Boolean, default: false },

    flitch_inventory_view: { type: Boolean, default: false },
    flitch_inventory_edit: { type: Boolean, default: false },
    flitch_inventory_create: { type: Boolean, default: false },

    plywood_inventory_view: { type: Boolean, default: false },
    plywood_inventory_edit: { type: Boolean, default: false },
    plywood_inventory_create: { type: Boolean, default: false },

    veneer_inventory_view: { type: Boolean, default: false },
    veneer_inventory_edit: { type: Boolean, default: false },
    veneer_inventory_create: { type: Boolean, default: false },

    mdf_inventory_view: { type: Boolean, default: false },
    mdf_inventory_edit: { type: Boolean, default: false },
    mdf_inventory_create: { type: Boolean, default: false },

    face_inventory_view: { type: Boolean, default: false },
    face_inventory_edit: { type: Boolean, default: false },
    face_inventory_create: { type: Boolean, default: false },

    core_inventory_view: { type: Boolean, default: false },
    core_inventory_edit: { type: Boolean, default: false },
    core_inventory_create: { type: Boolean, default: false },

    fleece_paper_inventory_view: { type: Boolean, default: false },
    fleece_paper_inventory_edit: { type: Boolean, default: false },
    fleece_paper_inventory_create: { type: Boolean, default: false },

    other_goods_inventory_view: { type: Boolean, default: false },
    other_goods_inventory_edit: { type: Boolean, default: false },
    other_goods_inventory_create: { type: Boolean, default: false },

    // factory permissions
    crosscut_factory_view: { type: Boolean, default: false },
    crosscut_factory_edit: { type: Boolean, default: false },
    crosscut_factory_create: { type: Boolean, default: false },

    flitching_factory_view: { type: Boolean, default: false },
    flitching_factory_edit: { type: Boolean, default: false },
    flitching_factory_create: { type: Boolean, default: false },

    // inventory_create: { type: Boolean, default: false },
    // inventory_edit: { type: Boolean, default: false },
    // inventory_view: { type: Boolean, default: false },

    // other_goods_create: { type: Boolean, default: false },
    // other_goods_edit: { type: Boolean, default: false },
    // other_goods_view: { type: Boolean, default: false },

    // grouped_veneer_create: { type: Boolean, default: false },
    // grouped_veneer_edit: { type: Boolean, default: false },
    // grouped_veneer_view: { type: Boolean, default: false },

    // grouping_create: { type: Boolean, default: false },
    // grouping_edit: { type: Boolean, default: false },
    // grouping_view: { type: Boolean, default: false },

    // smoking_create: { type: Boolean, default: false },
    // smoking_edit: { type: Boolean, default: false },
    // smoking_view: { type: Boolean, default: false },

    // dying_create: { type: Boolean, default: false },
    // dying_edit: { type: Boolean, default: false },
    // dying_view: { type: Boolean, default: false },

    // cutting_create: { type: Boolean, default: false },
    // cutting_edit: { type: Boolean, default: false },
    // cutting_view: { type: Boolean, default: false },

    // tapping_create: { type: Boolean, default: false },
    // tapping_edit: { type: Boolean, default: false },
    // tapping_view: { type: Boolean, default: false },

    // ready_sheet_form_create: { type: Boolean, default: false },
    // ready_sheet_form_edit: { type: Boolean, default: false },
    // ready_sheet_form_view: { type: Boolean, default: false },

    // pressing_create: { type: Boolean, default: false },
    // pressing_edit: { type: Boolean, default: false },
    // pressing_view: { type: Boolean, default: false },

    // finishing_create: { type: Boolean, default: false },
    // finishing_edit: { type: Boolean, default: false },
    // finishing_view: { type: Boolean, default: false },

    // qc_create: { type: Boolean, default: false },
    // qc_edit: { type: Boolean, default: false },
    // qc_view: { type: Boolean, default: false },

    // orders_create: { type: Boolean, default: false },
    // orders_edit: { type: Boolean, default: false },
    // orders_view: { type: Boolean, default: false },

    // dispatch_create: { type: Boolean, default: false },
    // dispatch_edit: { type: Boolean, default: false },
    // dispatch_view: { type: Boolean, default: false },
  },
  status: { type: Boolean, default: true },
  created_employee_id: {
    type: mongoose.Types.ObjectId,
    ref: "users",
    required: true,
    trim: true,
  },
  roles_remarks: {
    type: String,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const RolesModel = mongoose.model("roles", RoleSchema);

LogSchemaFunction("roles", RolesModel, []);
export default RolesModel;
