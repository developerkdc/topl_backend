import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import convDate from '../../../utils/date/date.js';

const GenerateRoleLogs = async (roles) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Role Logs');

  // Add headers to the worksheet
  const headers = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Operation Type', key: 'operationType', width: 20 },
    { header: 'Done By', key: 'created_by', width: 30 },
    { header: 'Role Name', key: 'role_name', width: 30 },
    { header: 'User Permissions', key: 'user_permissions', width: 38 },
    { header: 'Role Permissions', key: 'role_permissions', width: 38 },
    { header: 'Supplier Permissions', key: 'supplier_permissions', width: 38 },
    { header: 'Grade Permissions', key: 'grade_permissions', width: 38 },
    {
      header: 'Item Code Permissions',
      key: 'item_code_permissions',
      width: 35,
    },
    {
      header: 'Item Name Permissions',
      key: 'item_name_permissions',
      width: 35,
    },
    { header: 'Pallete Permissions', key: 'pallete_permissions', width: 38 },
    { header: 'Party Permissions', key: 'party_permissions', width: 38 },
    { header: 'Unit Permissions', key: 'unit_permissions', width: 38 },
    {
      header: 'Inventory Permissions',
      key: 'inventory_permissions',
      width: 35,
    },
    { header: 'Grouping Permissions', key: 'grouping_permissions', width: 38 },
    { header: 'Smoking Permissions', key: 'smoking_permissions', width: 38 },
    { header: 'Cutting Permissions', key: 'cutting_permissions', width: 38 },
    { header: 'Tapping Permissions', key: 'tapping_permissions', width: 38 },
    {
      header: 'Ready Sheet Form Permissions',
      key: 'ready_sheet_form_permissions',
      width: 35,
    },
    { header: 'Pressing Permissions', key: 'pressing_permissions', width: 38 },
    {
      header: 'Finishing Permissions',
      key: 'finishing_permissions',
      width: 35,
    },
    { header: 'QC Permissions', key: 'qc_permissions', width: 38 },
    { header: 'Orders Permissions', key: 'orders_permissions', width: 38 },
    { header: 'Dispatch Permissions', key: 'dispatch_permissions', width: 38 },
    {
      header: 'Grouped Veneer Permissions',
      key: 'grouped_veneer_permissions',
      width: 35,
    },
    {
      header: 'Other Goods Permissions',
      key: 'other_goods_permissions',
      width: 35,
    },
    { header: 'Dying Permissions', key: 'dying_permissions', width: 38 },
    { header: 'Role Status', key: 'status', width: 15 },
    { header: 'Remarks', key: 'roles_remarks', width: 30 },
  ];
  worksheet.columns = headers.map((header) => {
    return {
      header: header.header.toUpperCase(), // Convert to uppercase
      key: header.key,
      width: header.width,
    };
  });

  roles.forEach((role) => {
    const permissions = role.data.fullDocument.permissions;
    const row = worksheet.addRow({
      date: convDate(role.date),
      operationType: role.data.operationType,
      created_by: `${role.created_user_id.first_name} ${role.created_user_id.last_name} `,
      role_name: role.data.fullDocument.role_name,
      user_permissions: `Create: ${
        permissions?.user_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.user_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.user_view == true ? 'Active' : 'Inactive'}`,
      role_permissions: `Create: ${
        permissions?.role_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.role_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.role_view == true ? 'Active' : 'Inactive'}`,
      supplier_permissions: `Create: ${
        permissions?.supplier_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.supplier_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.supplier_master_view == true ? 'Active' : 'Inactive'
      }`,
      grade_permissions: `Create: ${
        permissions?.grade_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.grade_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.grade_master_view == true ? 'Active' : 'Inactive'
      }`,
      item_code_permissions: `Create: ${
        permissions?.item_code_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.item_code_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.item_code_master_view == true ? 'Active' : 'Inactive'
      }`,
      item_name_permissions: `Create: ${
        permissions?.item_name_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.item_name_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.item_name_master_view == true ? 'Active' : 'Inactive'
      }`,
      pallete_permissions: `Create: ${
        permissions?.pallete_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.pallete_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.pallete_master_view == true ? 'Active' : 'Inactive'
      }`,
      party_permissions: `Create: ${
        permissions?.party_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.party_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.party_master_view == true ? 'Active' : 'Inactive'
      }`,
      unit_permissions: `Create: ${
        permissions?.unit_master_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.unit_master_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.unit_master_view == true ? 'Active' : 'Inactive'
      }`,
      inventory_permissions: `Create: ${
        permissions?.inventory_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.inventory_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.inventory_view == true ? 'Active' : 'Inactive'}`,
      grouping_permissions: `Create: ${
        permissions?.grouping_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.grouping_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.grouping_view == true ? 'Active' : 'Inactive'}`,
      smoking_permissions: `Create: ${
        permissions?.smoking_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.smoking_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.smoking_view == true ? 'Active' : 'Inactive'}`,
      cutting_permissions: `Create: ${
        permissions?.cutting_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.cutting_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.cutting_view == true ? 'Active' : 'Inactive'}`,
      tapping_permissions: `Create: ${
        permissions?.tapping_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.tapping_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.tapping_view == true ? 'Active' : 'Inactive'}`,
      ready_sheet_form_permissions: `Create: ${
        permissions?.ready_sheet_form_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.ready_sheet_form_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.ready_sheet_form_view == true ? 'Active' : 'Inactive'
      }`,
      pressing_permissions: `Create: ${
        permissions?.pressing_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.pressing_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.pressing_view == true ? 'Active' : 'Inactive'}`,
      finishing_permissions: `Create: ${
        permissions?.finishing_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.finishing_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.finishing_view == true ? 'Active' : 'Inactive'}`,
      qc_permissions: `Create: ${
        permissions?.qc_create == true ? 'Active' : 'Inactive'
      }, Edit: ${permissions?.qc_edit == true ? 'Active' : 'Inactive'}, View: ${
        permissions?.qc_view == true ? 'Active' : 'Inactive'
      }`,
      orders_permissions: `Create: ${
        permissions?.orders_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.orders_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.orders_view == true ? 'Active' : 'Inactive'}`,
      dispatch_permissions: `Create: ${
        permissions?.dispatch_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.dispatch_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.dispatch_view == true ? 'Active' : 'Inactive'}`,
      grouped_veneer_permissions: `Create: ${
        permissions?.grouped_veneer_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.grouped_veneer_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.grouped_veneer_view == true ? 'Active' : 'Inactive'
      }`,
      other_goods_permissions: `Create: ${
        permissions?.other_goods_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.other_goods_edit == true ? 'Active' : 'Inactive'
      }, View: ${
        permissions?.other_goods_view == true ? 'Active' : 'Inactive'
      }`,
      dying_permissions: `Create: ${
        permissions?.dying_create == true ? 'Active' : 'Inactive'
      }, Edit: ${
        permissions?.dying_edit == true ? 'Active' : 'Inactive'
      }, View: ${permissions?.dying_view == true ? 'Active' : 'Inactive'}`,
      status: role.data.fullDocument.status == true ? 'Active' : 'Inactive',
      roles_remarks: role.data.fullDocument.roles_remarks,
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: 'left' };
    });
  });

  // Add totals row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export { GenerateRoleLogs };
