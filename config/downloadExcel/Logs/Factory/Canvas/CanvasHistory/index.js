// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';
// // import ApiError from '../../../../../../utils/errors/ApiError.js';

// export const createFactoryCanvasHistoryExcel = async (data, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory Canvas Damage Details');

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
//       { header: 'Canvas Sheets', key: 'canvas_sheets', width: 15 },
//       { header: 'Canvas SQM', key: 'canvas_sqm', width: 15 },
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
//       const canvas = item;
//       const issue = canvas.issue_for_canvas_details || {};
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
//         sr_no: canvas.sr_no ?? '',
//         issued_for: canvas.issued_for ?? '',
//         issue_status: canvas.issue_status ?? '',
//         issued_from: issue.issued_from ?? '',
//         issued_sheets: issue.issued_sheets ?? '',
//         issued_sqm: issue.issued_sqm ?? '',
//         available_sheets: issue.available_details?.no_of_sheets ?? '',
//         available_sqm: issue.available_details?.sqm ?? '',
//         canvas_sheets: canvas.no_of_sheets ?? '',
//         canvas_sqm: canvas.sqm ?? '',
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
//         factory_remark: canvas.factory_remark ?? '',
//         damage_remark: canvas.damage_remark ?? '',
//       });
//     }

//     // Write all rows
//     rows.forEach(row => worksheet.addRow(row));

//     // Response headers
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=Factory_Canvas_Damage_Full_Report.xlsx');

//     await workbook.xlsx.write(res);
//     res.status(200).end();
//   } catch (error) {
//     console.error(error);
//     throw new ApiError(500, 'Failed to generate Excel report');
//   }
// };












import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/apiError.js';

export const createFactoryCanvasHistoryExcel = async (data, req, res) => {
  try {
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Factory Canvas Damage Details');


    ws.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 15 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Issue Status', key: 'issue_status', width: 15 },

      { header: 'Canvas Date', key: 'canvas_date', width: 15 },   // 🆕
      { header: 'Order Date', key: 'order_date', width: 15 },   // 🆕

      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Photo No', key: 'photo_no', width: 12 },   // 🆕
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Item Name', key: 'item_name', width: 22 },   // 🆕
      { header: 'Item Sub-Category', key: 'item_sub_category', width: 18 },   // 🆕
      { header: 'Pressing ID', key: 'pressing_id', width: 15 },
      { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },

      { header: 'Press. Length', key: 'pressing_length', width: 12 },   // 🆕
      { header: 'Press. Width', key: 'pressing_width', width: 12 },   // 🆕
      { header: 'Press. Thickness', key: 'pressing_thickness', width: 15 },   // 🆕

      { header: 'Issued Sheets', key: 'issued_sheets', width: 13 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
      { header: 'Canvas Sheets', key: 'canvas_sheets', width: 13 },
      { header: 'Canvas SQM', key: 'canvas_sqm', width: 12 },

      { header: 'Issued Amount', key: 'issued_amount', width: 15 },   // 🆕
      { header: 'Canvas Amount', key: 'canvas_amount', width: 15 },   // 🆕

      { header: 'Available Sheets', key: 'available_sheets', width: 15 },
      { header: 'Available SQM', key: 'available_sqm', width: 15 },

      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Order Category', key: 'order_category', width: 18 },
      { header: 'Customer Name', key: 'customer_name', width: 22 },
      { header: 'Item No', key: 'item_no', width: 12 },   // 🆕
      { header: 'Series Product', key: 'series_product', width: 18 },   // 🆕
      { header: 'Series Code', key: 'series_product_code', width: 18 },


      { header: 'Flow Process', key: 'flow_process', width: 25 },
      { header: 'Base Items', key: 'base_items', width: 35 },
      { header: 'Face Items', key: 'face_items', width: 35 },
      { header: 'Group Item Names', key: 'group_items', width: 35 },

      { header: 'Factory Remark', key: 'factory_remark', width: 25 },
      { header: 'Damage Remark', key: 'damage_remark', width: 25 },

      { header: 'Created By', key: 'created_by', width: 18 },   // 🆕
      { header: 'Updated By', key: 'updated_by', width: 18 },   // 🆕
      { header: 'Created At', key: 'created_at', width: 15 },   // 🆕
      { header: 'Updated At', key: 'updated_at', width: 15 },   // 🆕
    ];
    ws.getRow(1).eachCell(c => (c.font = { bold: true }));
    const toDate = d => (d ? new Date(d).toLocaleDateString() : '');

    for (const canvas of Object.values(data ?? {})) {
      const issue = canvas.issue_for_canvas_details ?? {};
      const pressing = issue.pressing_details ?? {};
      const order = issue.order_details ?? {};
      const orderItem = issue.order_item_details ?? {};
      const consumed = issue.pressing_done_consumed_items_details ?? [];
      const firstGroup = consumed?.[0]?.group_details?.[0] ?? {};

      const baseItems = consumed.flatMap(p => p.base_details?.map(b => b.item_name) ?? []);
      const faceItems = consumed.flatMap(p => p.face_details?.map(f => f.item_name) ?? []);
      const groupItems = consumed.flatMap(p => p.group_details?.map(g => g.item_name) ?? []);

      ws.addRow({
        sr_no: canvas.sr_no,
        issued_from: issue.issued_from ?? '',
        issued_for: issue.issued_for ?? '',
        issue_status: canvas.issue_status ?? '',

        canvas_date: toDate(canvas.canvas_date),
        order_date: toDate(order.orderDate),

        product_type: pressing.product_type ?? '',
        photo_no: firstGroup.photo_no ?? '',
        group_no: pressing.group_no ?? '',
        item_name: firstGroup.item_name ?? '',
        item_sub_category: firstGroup.item_sub_category_name ?? '',
        pressing_id: pressing.pressing_id ?? '',
        pressing_instructions: pressing.pressing_instructions ?? '',
        pressing_date: toDate(pressing.pressing_date),

        pressing_length: pressing.length ?? '',
        pressing_width: pressing.width ?? '',
        pressing_thickness: pressing.thickness ?? '',

        issued_sheets: issue.issued_sheets ?? '',
        issued_sqm: issue.issued_sqm ?? '',
        canvas_sheets: canvas.no_of_sheets ?? '',
        canvas_sqm: canvas.sqm ?? '',

        issued_amount: issue.issued_amount ?? '',
        canvas_amount: canvas.amount ?? '',

        available_sheets: issue.available_details?.no_of_sheets ?? '',
        available_sqm: issue.available_details?.sqm ?? '',

        order_no: order.order_no ?? '',
        order_category: order.order_category ?? '',
        customer_name: order.owner_name ?? '',
        item_no: orderItem.item_no ?? '',
        series_product: order.series_product ?? '',
        series_product_code: pressing.series_product_code ?? '',


        flow_process: (pressing.flow_process ?? []).join(', '),
        base_items: baseItems.join(', '),
        face_items: faceItems.join(', '),
        group_items: groupItems.join(', '),

        factory_remark: canvas.factory_remark ?? '',
        damage_remark: canvas.damage_remark ?? '',

        created_by: canvas.created_by?.user_name ?? '',
        updated_by: canvas.updated_by?.user_name ?? '',
        created_at: toDate(canvas.createdAt),
        updated_at: toDate(canvas.updatedAt),
      });
    }


    res.setHeader(
      'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition', 'attachment; filename=Factory_Canvas_Damage_Full_Report.xlsx',
    );
    await wb.xlsx.write(res);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
