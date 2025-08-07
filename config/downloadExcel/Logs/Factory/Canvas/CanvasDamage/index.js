// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';

// export const createFactoryCanvasDamageExcel = async (newData, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory-Canvas-Done-Report');

//     // Define worksheet columns
//     worksheet.columns = [
//       { header: 'Sr. No', key: 'sr_no', width: 8 },
//       { header: 'Issued From', key: 'issued_from', width: 15 },
//       { header: 'Issued For', key: 'issued_for', width: 15 },
//       { header: 'Issue Status', key: 'issue_status', width: 15 },
//       { header: 'Product Type', key: 'product_type', width: 15 },
//       { header: 'Group No', key: 'group_no', width: 15 },
//       { header: 'Pressing ID', key: 'pressing_id', width: 15 },
//       { header: 'Pressing Instructions', key: 'pressing_instructions', width: 30 },
//       { header: 'Pressing Date', key: 'pressing_date', width: 18 },
//       { header: 'Canvas Date', key: 'canvas_date', width: 18 },
//       { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
//       { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
//       { header: 'Canvas Sheets', key: 'canvas_sheets', width: 15 },
//       { header: 'Canvas SQM', key: 'canvas_sqm', width: 15 },
//       { header: 'Order No', key: 'order_no', width: 12 },
//       { header: 'Order Category', key: 'order_category', width: 18 },
//       { header: 'Customer Name', key: 'customer_name', width: 25 },
//       { header: 'Series Code', key: 'series_product_code', width: 20 },
//       { header: 'Flow Process', key: 'flow_process', width: 30 },
//       { header: 'Base Items', key: 'base_items', width: 30 },
//       { header: 'Face Items', key: 'face_items', width: 30 },
//       { header: 'Group Item Names', key: 'group_items', width: 30 },
//       { header: 'Created By', key: 'created_by', width: 20 },
//       { header: 'Updated By', key: 'updated_by', width: 20 },
//     ];

//     // Convert newData object with numeric keys to array
//     const dataArray = Object.values(newData);

//     // Populate worksheet rows
//     for (const item of dataArray) {
//       const canvasDetails = item.canvas_done_details || {};
//       const pressingDetails = item?.issue_for_canvas_details?.pressing_details || {};
//       const orderDetails = item?.issue_for_canvas_details?.order_details || {};

//       const pressingConsumed = item?.issue_for_canvas_details?.pressing_done_consumed_items_details || [];

//       // Base items
//       const baseItems = pressingConsumed.flatMap(d =>
//         d.base_details?.map(b => b.item_name)
//       ) || [];

//       // Face items
//       const faceItems = pressingConsumed.flatMap(d =>
//         d.face_details?.map(f => f.item_name)
//       ) || [];

//       // Group items
//       const groupItems = pressingConsumed.flatMap(d =>
//         d.group_details?.map(g => g.item_name)
//       ) || [];

//       worksheet.addRow({
//         sr_no: item?.sr_no,
//         issued_from: item?.issue_for_canvas_details?.issued_from || '',
//         issued_for: item?.issue_for_canvas_details?.issued_for || '',
//         issue_status: item?.issue_status || '',
//         product_type: pressingDetails?.product_type || '',
//         group_no: pressingDetails?.group_no || '',
//         pressing_id: pressingDetails?.pressing_id || '',
//         pressing_instructions: pressingDetails?.pressing_instructions || '',
//         pressing_date: pressingDetails?.pressing_date
//           ? new Date(pressingDetails.pressing_date).toLocaleDateString()
//           : '',
//         canvas_date: canvasDetails?.canvas_date
//           ? new Date(canvasDetails.canvas_date).toLocaleDateString()
//           : '',
//         issued_sheets: item?.issue_for_canvas_details?.issued_sheets || '',
//         issued_sqm: item?.issue_for_canvas_details?.issued_sqm || '',
//         canvas_sheets: item?.no_of_sheets || '',
//         canvas_sqm: item?.sqm || '',
//         order_no: orderDetails?.order_no || '',
//         order_category: orderDetails?.order_category || '',
//         customer_name: orderDetails?.owner_name || '',
//         series_product_code: pressingDetails?.series_product_code || '',
//         flow_process: pressingDetails?.flow_process?.join(', ') || '',
//         base_items: baseItems.join(', '),
//         face_items: faceItems.join(', '),
//         group_items: groupItems.join(', '),
//         created_by: item?.created_by?.user_name || '',
//         updated_by: item?.updated_by?.user_name || '',
//       });
//     }

//     // Set response headers
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=Factory-Canvas-Damage-Report.xlsx');

//     // Write workbook to response
//     await workbook.xlsx.write(res);
//     res.status(200).end();

//   } catch (error) {
//     console.error(error);
//     throw new ApiError(500, 'Failed to generate Excel report');
//   }
// };








import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/apiError.js';

export const createFactoryCanvasDamageExcel = async (records, req, res) => {
  try {
    /* workbook / sheet */
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Canvas Damage');
    const toDate = d => (d ? new Date(d).toLocaleDateString('en-GB') : '');

    /* ► columns – EXACTLY the fields in CanvasDamageTableRow ◄ */
    ws.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued For', key: 'issued_for', width: 14 },
      { header: 'Canvas Date', key: 'canvas_date', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Customer', key: 'customer_name', width: 20 },
      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 16 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Item Name', key: 'item_name', width: 22 },
      { header: 'Sub-Category', key: 'item_sub_category', width: 18 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 12 },
      { header: 'Canvas Sheets', key: 'canvas_sheets', width: 14 },
      { header: 'Canvas SQM', key: 'canvas_sqm', width: 12 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'created_at', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 15 },
    ];
    ws.getRow(1).eachCell(c => (c.font = { bold: true }));

    /* ► rows */
    for (const rec of Object.values(records ?? {})) {
      const issue = rec.issue_for_canvas_details ?? {};
      const pressing = issue.pressing_details ?? {};
      const order = issue.order_details ?? {};
      const itemDet = issue.order_item_details ?? {};
      const cons = issue.pressing_done_consumed_items_details ?? [];
      const grp = cons?.[0]?.group_details?.[0] ?? {};

      ws.addRow({
        sr_no: rec.sr_no,
        issued_for: issue.issued_for ?? '',
        canvas_date: toDate(rec.canvas_done_details?.canvas_date),
        order_date: toDate(order.orderDate),
        customer_name: order.owner_name ?? '',
        order_no: order.order_no ?? '',
        item_no: itemDet.item_no ?? '',
        series_product: order.series_product ?? '',
        photo_no: grp.photo_no ?? itemDet.photo_number ?? '',
        group_no: grp.group_no ?? '',
        item_name: grp.item_name ?? itemDet.item_name ?? '',
        item_sub_category: grp.item_sub_category_name
          ?? itemDet.item_sub_category_name ?? '',
        length: pressing.length ?? '',
        width: pressing.width ?? '',
        thickness: pressing.thickness ?? '',
        canvas_sheets: rec.no_of_sheets ?? '',
        canvas_sqm: rec.sqm ?? '',
        created_by: rec.created_by?.user_name ?? '',
        updated_by: rec.updated_by?.user_name
          ?? rec.updated_user_details?.user_name ?? '',
        created_at: toDate(rec.createdAt),
        updated_at: toDate(rec.updatedAt),
      });
    }

    /* ► stream the file */
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Canvas_Damage.xlsx'
    );
    await wb.xlsx.write(res);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
