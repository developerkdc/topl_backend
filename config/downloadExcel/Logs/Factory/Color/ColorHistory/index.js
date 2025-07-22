// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';

// export const createFactoryColorHistoryExcel = async (data, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory Color Damage Details');

//     // Define all possible fields
//     worksheet.columns = [
//       { header: 'Sr. No', key: 'sr_no', width: 8 },
//       { header: 'Issued For', key: 'issued_for', width: 15 },
//       { header: 'Issue Status', key: 'issue_status', width: 15 },
//       { header: 'Issued From', key: 'issued_from', width: 20 },
//       { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
//       { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
//       { header: 'Available Sheets', key: 'available_sheets', width: 18 },
//       { header: 'Available SQM', key: 'available_sqm', width: 18 },
//       { header: 'Color Sheets', key: 'color_sheets', width: 15 },
//       { header: 'Color SQM', key: 'color_sqm', width: 15 },
//       { header: 'Order No', key: 'order_no', width: 15 },
//       { header: 'Customer', key: 'customer', width: 25 },
//       { header: 'Order Type', key: 'order_type', width: 20 },
//       { header: 'Product Type', key: 'product_type', width: 20 },
//       { header: 'Group No', key: 'group_no', width: 15 },
//       { header: 'Series Code', key: 'series_code', width: 15 },
//       { header: 'Pressing Date', key: 'pressing_date', width: 18 },
//       { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
//       { header: 'Flow Process', key: 'flow_process', width: 20 },
//       { header: 'Pressing Sheets', key: 'pressing_sheets', width: 15 },
//       { header: 'Pressing SQM', key: 'pressing_sqm', width: 15 },
//       { header: 'Pressing Remark', key: 'pressing_remark', width: 20 },
//       { header: 'Base Items', key: 'base_items', width: 40 },
//       { header: 'Group Items', key: 'group_items', width: 40 },
//       { header: 'Factory Remark', key: 'factory_remark', width: 30 },
//       { header: 'Damage Remark', key: 'damage_remark', width: 30 },
//     ];

//     const rows = [];

//     for (const item of Object.values(data)) {
//       const color = item;
//       const issue = color.issue_for_color_details || {};
//       const pressing = issue.pressing_details || {};
//       const order = issue.order_details || {};
//       const pressingItems = issue.pressing_done_consumed_items_details || [];

//       // Base items extraction
//       const baseItems = pressingItems.flatMap(p =>
//         (p.base_details || []).map(b => `${b.item_name} (${b.base_type}) x ${b.no_of_sheets}`)
//       );

//       // Group items extraction
//       const groupItems = pressingItems.flatMap(p =>
//         (p.group_details || []).map(g => `${g.item_name} (${g.group_no}) x ${g.no_of_sheets}`)
//       );

//       rows.push({
//         sr_no: color.sr_no ?? '',
//         issued_for: color.issued_for ?? '',
//         issue_status: color.issue_status ?? '',
//         issued_from: issue.issued_from ?? '',
//         issued_sheets: issue.issued_sheets ?? '',
//         issued_sqm: issue.issued_sqm ?? '',
//         available_sheets: issue.available_details?.no_of_sheets ?? '',
//         available_sqm: issue.available_details?.sqm ?? '',
//         color_sheets: color.no_of_sheets ?? '',
//         color_sqm: color.sqm ?? '',
//         order_no: order.order_no ?? '',
//         customer: order.owner_name ?? '',
//         order_type: order.order_type ?? '',
//         product_type: pressing.product_type ?? '',
//         group_no: pressing.group_no ?? '',
//         series_code: pressing.series_product_code ?? '',
//         pressing_date: pressing.pressing_date
//           ? new Date(pressing.pressing_date).toLocaleDateString()
//           : '',
//         pressing_instructions: pressing.pressing_instructions ?? '',
//         flow_process: (pressing.flow_process || []).join(', '),
//         pressing_sheets: pressing.no_of_sheets ?? '',
//         pressing_sqm: pressing.sqm ?? '',
//         pressing_remark: pressing.remark ?? '',
//         base_items: baseItems.join('; '),
//         group_items: groupItems.join('; '),
//         factory_remark: color.factory_remark ?? '',
//         damage_remark: color.damage_remark ?? '',
//       });
//     }

//     // Write all rows
//     rows.forEach(row => worksheet.addRow(row));

//     // Response headers
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=Factory_Color_Damage_Full_Report.xlsx');

//     await workbook.xlsx.write(res);
//     res.status(200).end();
//   } catch (error) {
//     console.error(error);
//     throw new ApiError(500, 'Failed to generate Excel report');
//   }
// };








import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/apiError.js';

export const createFactoryColorHistoryExcel = async (data, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory Color Damage Details');

    worksheet.columns = [
      /* existing ------------------------------------------------------- */
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 25 },
      { header: 'Item Sub-Category', key: 'item_sub_category', width: 18 },
      { header: 'Issue Status', key: 'issue_status', width: 15 },
      { header: 'Issued From', key: 'issued_from', width: 20 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
      { header: 'Available Sheets', key: 'available_sheets', width: 18 },
      { header: 'Available SQM', key: 'available_sqm', width: 18 },
      { header: 'Color Sheets', key: 'color_sheets', width: 15 },
      { header: 'Color SQM', key: 'color_sqm', width: 15 },
      { header: 'Order No', key: 'order_no', width: 15 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Order Type', key: 'order_type', width: 20 },
      { header: 'Product Type', key: 'product_type', width: 20 },
      { header: 'Group No', key: 'group_no', width: 15 },
      { header: 'Series Code', key: 'series_code', width: 15 },
      { header: 'Pressing Date', key: 'pressing_date', width: 18 },
      { header: 'Pressing Instr.', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 20 },
      { header: 'Pressing Sheets', key: 'pressing_sheets', width: 15 },
      { header: 'Pressing SQM', key: 'pressing_sqm', width: 15 },
      { header: 'Pressing Remark', key: 'pressing_remark', width: 20 },
      { header: 'Base Items', key: 'base_items', width: 40 },
      { header: 'Group Items', key: 'group_items', width: 40 },
      { header: 'Factory Remark', key: 'factory_remark', width: 30 },
      { header: 'Damage Remark', key: 'damage_remark', width: 30 },

      /* 🆕 added so Excel mirrors the table ---------------------------- */
      { header: 'Color Date', key: 'color_date', width: 18 },
      { header: 'Order Date', key: 'order_date', width: 18 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 18 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Pressing Length', key: 'pressing_length', width: 15 },
      { header: 'Pressing Width', key: 'pressing_width', width: 15 },
      { header: 'Pressing Thickness', key: 'pressing_thickness', width: 15 },
      { header: 'Issued Amount', key: 'issued_amount', width: 15 },
      { header: 'Color Amount', key: 'color_amount', width: 15 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'created_at', width: 18 },
      { header: 'Updated At', key: 'updated_at', width: 18 },
    ];

    const rows = [];

    for (const item of Object.values(data ?? {})) {
      const col = item;
      const issue = col.issue_for_colour_details ?? {};
      const pressing = issue.pressing_details ?? {};
      const order = issue.order_details ?? {};
      const orderItem = issue.order_item_details ?? {};
      const consumed = issue.pressing_done_consumed_items_details ?? [];

      const firstGroup = consumed?.[0]?.group_details?.[0] ?? {};

      /* helpers */
      const toDate = d => (d ? new Date(d).toLocaleDateString() : '');

      /* build arrays of base/group items */
      const baseItems = consumed.flatMap(p =>
        (p.base_details ?? []).map(b => `${b.item_name} (${b.base_type}) x ${b.no_of_sheets}`));
      const groupItems = consumed.flatMap(p =>
        (p.group_details ?? []).map(g => `${g.item_name} (${g.group_no}) x ${g.no_of_sheets}`));

      rows.push({
        /* existing ----------------------------------------------------- */
        sr_no: col.sr_no ?? '',
        issued_for: col.issued_for ?? '',
        item_name: firstGroup.item_name ?? '',
        item_sub_category: firstGroup.item_sub_category_name ?? '',
        issue_status: col.issue_status ?? '',
        issued_from: issue.issued_from ?? '',
        issued_sheets: issue.issued_sheets ?? '',
        issued_sqm: issue.issued_sqm ?? '',
        available_sheets: issue.available_details?.no_of_sheets ?? '',
        available_sqm: issue.available_details?.sqm ?? '',
        color_sheets: col.no_of_sheets ?? '',
        color_sqm: col.sqm ?? '',
        order_no: order.order_no ?? '',
        customer: order.owner_name ?? '',
        order_type: order.order_type ?? '',
        product_type: pressing.product_type ?? '',
        group_no: pressing.group_no ?? '',
        series_code: pressing.series_product_code ?? '',
        pressing_date: toDate(pressing.pressing_date),
        pressing_instructions: pressing.pressing_instructions ?? '',
        flow_process: (pressing.flow_process ?? []).join(', '),
        pressing_sheets: pressing.no_of_sheets ?? '',
        pressing_sqm: pressing.sqm ?? '',
        pressing_remark: pressing.remark ?? '',
        base_items: baseItems.join('; '),
        group_items: groupItems.join('; '),
        factory_remark: col.factory_remark ?? '',
        damage_remark: col.damage_remark ?? '',

        /* 🆕 new -------------------------------------------------------- */
        color_date: toDate(col.colour_date),
        order_date: toDate(order.orderDate),
        item_no: orderItem.item_no ?? '',
        series_product: order.series_product ?? '',
        photo_no: firstGroup.photo_no ?? '',
        pressing_length: pressing.length ?? '',
        pressing_width: pressing.width ?? '',
        pressing_thickness: pressing.thickness ?? '',
        issued_amount: issue.issued_amount ?? '',
        color_amount: col.amount ?? '',
        created_by: col.created_by?.user_name ?? '',
        updated_by: col.updated_by?.user_name ?? '',
        created_at: toDate(col.createdAt),
        updated_at: toDate(col.updatedAt),
      });
    }

    rows.forEach(row => worksheet.addRow(row));

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      'attachment; filename=Factory_Color_Damage_Full_Report.xlsx');

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
