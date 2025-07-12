// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/ApiError.js';

// export const createFactorypolishingDamageExcel = async (newData, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory-polishing-Done-Report');

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
//       { header: 'polishing Date', key: 'polishing_date', width: 18 },
//       { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
//       { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
//       { header: 'polishing Sheets', key: 'polishing_sheets', width: 15 },
//       { header: 'polishing SQM', key: 'polishing_sqm', width: 15 },
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
//       const polishingDetails = item.polishing_done_details || {};
//       const pressingDetails = item?.issue_for_polishing_details?.pressing_details || {};
//       const orderDetails = item?.issue_for_polishing_details?.order_details || {};

//       const pressingConsumed = item?.issue_for_polishing_details?.pressing_done_consumed_items_details || [];

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
//         issued_from: item?.issue_for_polishing_details?.issued_from || '',
//         issued_for: item?.issue_for_polishing_details?.issued_for || '',
//         issue_status: item?.issue_status || '',
//         product_type: pressingDetails?.product_type || '',
//         group_no: pressingDetails?.group_no || '',
//         pressing_id: pressingDetails?.pressing_id || '',
//         pressing_instructions: pressingDetails?.pressing_instructions || '',
//         pressing_date: pressingDetails?.pressing_date
//           ? new Date(pressingDetails.pressing_date).toLocaleDateString()
//           : '',
//         polishing_date: polishingDetails?.polishing_date
//           ? new Date(polishingDetails.polishing_date).toLocaleDateString()
//           : '',
//         issued_sheets: item?.issue_for_polishing_details?.issued_sheets || '',
//         issued_sqm: item?.issue_for_polishing_details?.issued_sqm || '',
//         polishing_sheets: item?.no_of_sheets || '',
//         polishing_sqm: item?.sqm || '',
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
//     res.setHeader('Content-Disposition', 'attachment; filename=Factory-polishing-Damage-Report.xlsx');

//     // Write workbook to response
//     await workbook.xlsx.write(res);
//     res.status(200).end();

//   } catch (error) {
//     console.error(error);
//     throw new ApiError(500, 'Failed to generate Excel report');
//   }
// };




import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/ApiError.js';

export const createFactoryPolishDamageExcel = async (newData, req, res) => {
  try {
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet('Factory-polishing-Damage-Report');

    ws.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 15 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Issue Status', key: 'issue_status', width: 15 },

      { header: 'polishing Date', key: 'polishing_date', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 15 },   // 🆕

      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Photo No', key: 'photo_no', width: 12 },   // 🆕
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Item Name', key: 'item_name', width: 22 },   // 🆕
      { header: 'Item Sub-Category', key: 'item_sub_category', width: 18 },   // 🆕
      { header: 'Pressing ID', key: 'pressing_id', width: 15 },
      { header: 'Pressing Instructions', key: 'pressing_instructions', width: 28 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },

      { header: 'Press. Length', key: 'pressing_length', width: 12 },   // 🆕
      { header: 'Press. Width', key: 'pressing_width', width: 12 },   // 🆕
      { header: 'Press. Thickness', key: 'pressing_thickness', width: 15 },   // 🆕

      { header: 'Issued Sheets', key: 'issued_sheets', width: 13 },
      { header: 'Available Sheets', key: 'available_sheets', width: 15 },   // 🆕
      { header: 'polishing Sheets', key: 'polishing_sheets', width: 13 },

      { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
      { header: 'Available SQM', key: 'available_sqm', width: 14 },   // 🆕
      { header: 'polishing SQM', key: 'polishing_sqm', width: 12 },

      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Item No', key: 'item_no', width: 12 },   // 🆕
      { header: 'Order Category', key: 'order_category', width: 18 },
      { header: 'Customer Name', key: 'customer_name', width: 22 },
      { header: 'Series Product', key: 'series_product', width: 15 },   // 🆕
      { header: 'Series Code', key: 'series_product_code', width: 18 },


      { header: 'Flow Process', key: 'flow_process', width: 25 },
      { header: 'Base Items', key: 'base_items', width: 30 },
      { header: 'Face Items', key: 'face_items', width: 30 },
      { header: 'Group Item Names', key: 'group_items', width: 30 },

      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'created_at', width: 15 },   // 🆕
      { header: 'Updated At', key: 'updated_at', width: 15 },   // 🆕
    ];
    ws.getRow(1).eachCell(c => (c.font = { bold: true }));
    const toDate = d => (d ? new Date(d).toLocaleDateString() : '');


    for (const item of Object.values(newData ?? {})) {
      const issue = item.issue_for_polishing_details ?? {};
      const pressing = issue.pressing_details ?? {};
      const order = issue.order_details ?? {};
      const orderItem = issue.order_item_details ?? {};
      const consumed = issue.pressing_done_consumed_items_details ?? [];
      const firstGrp = consumed?.[0]?.group_details?.[0] ?? {};
      const polishing = item.polishing_done_details ?? {};

      const baseItems = consumed.flatMap(p => p.base_details?.map(b => b.item_name) ?? []);
      const faceItems = consumed.flatMap(p => p.face_details?.map(f => f.item_name) ?? []);
      const groupItems = consumed.flatMap(p => p.group_details?.map(g => g.item_name) ?? []);

      ws.addRow({
        /* identifiers -------------------------------------------------- */
        sr_no: item.sr_no,
        issued_from: issue.issued_from ?? '',
        issued_for: issue.issued_for ?? '',
        issue_status: item.issue_status ?? '',

        /* key dates ---------------------------------------------------- */
        polishing_date: toDate(polishing.polishing_date),
        order_date: toDate(order.orderDate),

        /* pressing info ------------------------------------------------ */
        product_type: pressing.product_type ?? '',
        group_no: pressing.group_no ?? '',
        photo_no: firstGrp.photo_no ?? '',
        item_name: firstGrp.item_name ?? '',
        item_sub_category: firstGrp.item_sub_category_name ?? '',
        pressing_id: pressing.pressing_id ?? '',
        pressing_instructions: pressing.pressing_instructions ?? '',
        pressing_date: toDate(pressing.pressing_date),

        pressing_length: pressing.length ?? '',
        pressing_width: pressing.width ?? '',
        pressing_thickness: pressing.thickness ?? '',

        /* quantities --------------------------------------------------- */
        issued_sheets: issue.issued_sheets ?? '',
        available_sheets: issue.available_details?.no_of_sheets ?? '',
        polishing_sheets: item.no_of_sheets ?? '',

        issued_sqm: issue.issued_sqm ?? '',
        available_sqm: issue.available_details?.sqm ?? '',
        polishing_sqm: item.sqm ?? '',

        /* order & item ------------------------------------------------- */
        order_no: order.order_no ?? '',
        item_no: orderItem.item_no ?? '',
        order_category: order.order_category ?? '',
        customer_name: order.owner_name ?? '',
        series_product: order.series_product ?? '',
        series_product_code: pressing.series_product_code ?? '',


        /* lists -------------------------------------------------------- */
        flow_process: (pressing.flow_process ?? []).join(', '),
        base_items: baseItems.join(', '),
        face_items: faceItems.join(', '),
        group_items: groupItems.join(', '),

        created_by: item.created_by?.user_name ?? '',
        updated_by: item.updated_by?.user_name ?? '',
        created_at: toDate(item.createdAt),
        updated_at: toDate(item.updatedAt),
      });
    }


    res.setHeader(
      'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition', 'attachment; filename=Factory-polishing-Damage-Report.xlsx',
    );
    await wb.xlsx.write(res);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
