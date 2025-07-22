// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/ApiError.js';

// export const createFactoryPolishHistoryExcel = async (data, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory polishing Damage Details');

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
//       { header: 'polishing Sheets', key: 'polish_sheets', width: 15 },
//       { header: 'polishing SQM', key: 'polish_sqm', width: 15 },
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
//       const polishing = item;
//       const issue = polishing.issue_for_polish_details || {};
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
//         sr_no: polishing.sr_no ?? '',
//         issued_for: polishing.issued_for ?? '',
//         issue_status: polishing.issue_status ?? '',
//         issued_from: issue.issued_from ?? '',
//         issued_sheets: issue.issued_sheets ?? '',
//         issued_sqm: issue.issued_sqm ?? '',
//         available_sheets: issue.available_details?.no_of_sheets ?? '',
//         available_sqm: issue.available_details?.sqm ?? '',
//         polish_sheets: polishing.no_of_sheets ?? '',
//         polish_sqm: polishing.sqm ?? '',
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
//         factory_remark: polishing.factory_remark ?? '',
//         damage_remark: polishing.damage_remark ?? '',
//       });
//     }

//     // Write all rows
//     rows.forEach(row => worksheet.addRow(row));

//     // Response headers
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=Factory_Polish_History_Full_Report.xlsx');

//     await workbook.xlsx.write(res);
//     res.status(200).end();
//   } catch (error) {
//     console.error(error);
//     throw new ApiError(500, 'Failed to generate Excel report');
//   }
// };



import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/apiError.js';

export const createFactoryPolishHistoryExcel = async (data, req, res) => {
  try {
    /* 1️⃣  Workbook / sheet ----------------------------------------- */
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Factory Polish History');
    const toDate = d => (d ? new Date(d).toLocaleDateString('en-GB') : '');

    /* 2️⃣  Columns – ONLY the ones the UI shows ---------------------- */
    ws.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issue Status', key: 'issue_status', width: 15 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Polish Date', key: 'polish_date', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Customer', key: 'customer', width: 22 },
      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 15 },
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Item Name', key: 'item_name', width: 22 },
      { header: 'Item Sub‑Category', key: 'item_sub_category', width: 18 },
      { header: 'Length', key: 'length', width: 12 },
      { header: 'Width', key: 'width', width: 12 },
      { header: 'Thickness', key: 'thickness', width: 12 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Polish Sheets', key: 'polish_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 14 },
      { header: 'Polish SQM', key: 'polish_sqm', width: 14 },
      { header: 'Issued Amount', key: 'issued_amount', width: 16 },
      { header: 'Polish Amount', key: 'polish_amount', width: 16 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'created_at', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 15 },
    ];
    ws.getRow(1).eachCell(c => (c.font = { bold: true }));

    /* 3️⃣  Rows ------------------------------------------------------- */
    for (const polishing of Object.values(data ?? {})) {
      /* robust path fallbacks – handle either key variant ------------- */
      const issue = polishing.issue_for_polishing_details
        ?? polishing.issue_for_polish_details
        ?? {};
      const pressing = issue.pressing_details ?? {};
      const order = issue.order_details ?? {};
      const orderItem = issue.order_item_details ?? {};
      const consumed = issue.pressing_done_consumed_items_details ?? [];
      const firstGrp = consumed?.[0]?.group_details?.[0] ?? {};

      ws.addRow({
        sr_no: polishing.sr_no,
        issue_status: polishing.issue_status ?? '',
        issued_for: issue.issued_for ?? '',
        polish_date: toDate(polishing.polishing_date             /* top‑level */ ||
          polishing.polish_date                /* damage key */ ||
          polishing.polish_done_details?.polish_date),

        order_date: toDate(order.orderDate),
        customer: order.owner_name ?? '',
        order_no: order.order_no ?? '',
        item_no: orderItem.item_no ?? '',
        series_product: order.series_product ?? '',
        group_no: firstGrp.group_no ?? '',
        photo_no: firstGrp.photo_no ?? orderItem.photo_number ?? '',
        item_name: firstGrp.item_name ?? orderItem.item_name ?? '',
        item_sub_category: firstGrp.item_sub_category_name ?? orderItem.item_sub_category_name ?? '',
        length: pressing.length ?? orderItem.length ?? '',
        width: pressing.width ?? orderItem.width ?? '',
        thickness: pressing.thickness ?? orderItem.thickness ?? '',

        issued_sheets: issue.issued_sheets ?? '',
        polish_sheets: polishing.no_of_sheets ?? '',
        issued_sqm: (issue.issued_sqm ?? '').toString(),
        polish_sqm: (polishing.sqm ?? '').toString(),

        issued_amount: (issue.issued_amount ?? '').toString(),
        polish_amount: (polishing.amount ?? '').toString(),

        created_by: polishing.created_by?.user_name ?? '',
        updated_by: polishing.updated_by?.user_name
          ?? polishing.updated_user_details?.user_name
          ?? '',
        created_at: toDate(polishing.createdAt),
        updated_at: toDate(polishing.updatedAt),
      });
    }

    /* 4️⃣  Stream the file ------------------------------------------- */
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      'attachment; filename=Factory_Polish_History.xlsx');
    await wb.xlsx.write(res);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
