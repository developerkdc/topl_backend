// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';

// export const createFactoryCanvasDoneExcel = async (newData, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory-Canvas-Done-Report');

//     worksheet.columns = [
//       { header: 'Sr. No', key: 'sr_no', width: 8 },
//       { header: 'Issued From', key: 'issued_from', width: 18 },
//       { header: 'Issued For', key: 'issued_for', width: 15 },
//       { header: 'Product Type', key: 'product_type', width: 15 },
//       { header: 'Group No', key: 'group_no', width: 15 },
//       { header: 'Item Name', key: 'base_items', width: 25 },
//       { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
//       { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
//       { header: 'Issued Amount', key: 'issued_amount', width: 15 },
//       { header: 'Is Canvas Done', key: 'is_canvas_done', width: 12 },
//       { header: 'Machine Name', key: 'machine_name', width: 20 },
//       { header: 'Pressing ID', key: 'pressing_id', width: 20 },
//       { header: 'Pressing Date', key: 'pressing_date', width: 15 },
//       { header: 'Shift', key: 'shift', width: 10 },
//       { header: 'No. of Workers', key: 'no_of_workers', width: 15 },
//       { header: 'Working Hours', key: 'working_hours', width: 15 },
//       { header: 'Total Hours', key: 'total_hours', width: 15 },
//       { header: 'Length', key: 'length', width: 10 },
//       { header: 'Width', key: 'width', width: 10 },
//       { header: 'Base Thickness', key: 'base_thickness', width: 15 },
//       { header: 'Veneer Thickness', key: 'veneer_thickness', width: 15 },
//       { header: 'Total Thickness', key: 'thickness', width: 15 },
//       { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
//       { header: 'Flow Process', key: 'flow_process', width: 25 },
//       { header: 'Created By', key: 'created_by', width: 20 },
//       { header: 'Created At', key: 'createdAt', width: 20 },
//       { header: 'Updated At', key: 'updatedAt', width: 20 }
//     ];

//     worksheet.getRow(1).eachCell((cell) => {
//       cell.font = { bold: true };
//     });

//     const flattenedArray = Object.values(newData);

//     flattenedArray.forEach((item) => {
//       const issueDetails = item.issue_for_colour_details || {};
//       const pressing = issueDetails.pressing_details || {};
//       const baseDetails = issueDetails.pressing_done_consumed_items_details?.[0]?.base_details || [];

//       const baseItems = baseDetails.map((base) => base.item_name).join(', ');

//       const createdUser = item.created_by || {};
//       const fullName = `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim();

//       worksheet.addRow({
//         sr_no: item.sr_no,
//         issued_from: issueDetails.issued_from || '',
//         issued_for: issueDetails.issued_for || '',
//         product_type: pressing.product_type || '',
//         group_no: pressing.group_no || '',
//         base_items: baseItems,
//         issued_sheets: issueDetails.issued_sheets || '',
//         issued_sqm: issueDetails.issued_sqm || '',
//         issued_amount: issueDetails.issued_amount || '',
//         is_canvas_done: issueDetails.is_canvas_done ? 'Yes' : 'No',
//         machine_name: pressing.machine_name || '',
//         pressing_id: pressing.pressing_id || '',
//         pressing_date: pressing.pressing_date ? new Date(pressing.pressing_date).toLocaleDateString() : '',
//         shift: pressing.shift || '',
//         no_of_workers: pressing.no_of_workers || '',
//         working_hours: pressing.no_of_working_hours || '',
//         total_hours: pressing.no_of_total_hours || '',
//         length: pressing.length || '',
//         width: pressing.width || '',
//         base_thickness: pressing.base_thickness || '',
//         veneer_thickness: pressing.veneer_thickness || '',
//         thickness: pressing.thickness || '',
//         pressing_instructions: pressing.pressing_instructions || '',
//         flow_process: Array.isArray(pressing.flow_process) ? pressing.flow_process.join(', ') : '',
//         created_by: fullName,
//         createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
//         updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
//       });
//     });

//     const timestamp = Date.now();
//     const fileName = `Canvas_Done_Report_${timestamp}.xlsx`;

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error('Excel generation error:', error);
//     throw new ApiError(500, error.message);
//   }
// };










import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/apiError.js';

export const createFactoryCanvasDoneExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory-Canvas-Done-Report');

    worksheet.columns = [

      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 18 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Item Name', key: 'base_items', width: 25 },
      { header: 'Item Sub-Category', key: 'item_sub_category', width: 20 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 13 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
      { header: 'Issued Amount', key: 'issued_amount', width: 15 },
      { header: 'Is Canvas Done', key: 'is_canvas_done', width: 12 },
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Pressing ID', key: 'pressing_id', width: 18 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'No. of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Total Hours', key: 'total_hours', width: 15 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Base Thickness', key: 'base_thickness', width: 15 },
      { header: 'Veneer Thickness', key: 'veneer_thickness', width: 15 },
      { header: 'Total Thickness', key: 'thickness', width: 15 },
      { header: 'Pressing Instr.', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 25 },

      /* 🆕  new columns to mirror UI ---------------------------------- */
      { header: 'Canvas Date', key: 'canvas_date', width: 15 },
      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Customer Name', key: 'customer_name', width: 20 },
      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 15 },


      { header: 'Canvas Sheets', key: 'canvas_sheets', width: 13 },
      { header: 'Available Sheets', key: 'available_sheets', width: 15 },
      { header: 'Canvas SQM', key: 'canvas_sqm', width: 12 },
      { header: 'Available SQM', key: 'available_sqm', width: 14 },

      { header: 'Canvas Amount', key: 'canvas_amount', width: 15 },
      { header: 'Available Amount', key: 'available_amount', width: 15 },

      { header: 'Remark', key: 'remark', width: 25 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'created_at', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 15 },
    ];

    worksheet.getRow(1).eachCell(c => (c.font = { bold: true }));

    /* helper for dates */
    const toDate = d => (d ? new Date(d).toLocaleDateString() : '');

    for (const item of Object.values(newData ?? {})) {
      const issue = item.issue_for_canvas_details ?? {};
      const pressing = issue.pressing_details ?? {};
      const order = issue.order_details ?? {};
      const orderItem = issue.order_item_details ?? {};
      const consumed = issue.pressing_done_consumed_items_details ?? [];
      const firstGroup = consumed?.[0]?.group_details?.[0] ?? {};

      const baseItems = (consumed?.[0]?.base_details ?? [])
        .map(b => b.item_name)
        .join(', ');

      const creator = item.created_by ?? {};
      const updator = item.updated_by ?? {};

      worksheet.addRow({
        /* originals --------------------------------------------------- */
        sr_no: item.sr_no,
        issued_from: issue.issued_from ?? '',
        issued_for: issue.issued_for ?? '',
        product_type: pressing.product_type ?? '',
        photo_no: firstGroup.photo_no ?? '',
        group_no: pressing.group_no ?? '',
        base_items: baseItems,
        item_sub_category: firstGroup.item_sub_category_name ?? '',
        issued_sheets: issue.issued_sheets ?? '',
        issued_sqm: issue.issued_sqm ?? '',
        issued_amount: issue.issued_amount ?? '',
        is_canvas_done: 'Yes',
        machine_name: pressing.machine_name ?? '',
        pressing_id: pressing.pressing_id ?? '',
        pressing_date: toDate(pressing.pressing_date),
        shift: pressing.shift ?? '',
        no_of_workers: pressing.no_of_workers ?? '',
        working_hours: pressing.no_of_working_hours ?? '',
        total_hours: pressing.no_of_total_hours ?? '',
        length: pressing.length ?? '',
        width: pressing.width ?? '',
        base_thickness: pressing.base_thickness ?? '',
        veneer_thickness: pressing.veneer_thickness ?? '',
        thickness: pressing.thickness ?? '',
        pressing_instructions: pressing.pressing_instructions ?? '',
        flow_process: Array.isArray(pressing.flow_process)
          ? pressing.flow_process.join(', ')
          : '',

        /* new fields from UI ----------------------------------------- */
        canvas_date: toDate(item.canvas_date),
        order_date: toDate(order.orderDate),
        customer_name: order.owner_name ?? '',
        order_no: order.order_no ?? '',
        item_no: orderItem.item_no ?? '',
        series_product: order.series_product ?? '',


        canvas_sheets: item.no_of_sheets ?? '',
        available_sheets: item.available_details?.no_of_sheets ?? '',
        canvas_sqm: item.sqm ?? '',
        available_sqm: item.available_details?.sqm ?? '',

        canvas_amount: item.amount ?? '',
        available_amount: item.available_details?.amount ?? '',

        remark: item.remark ?? '',
        created_by: creator.user_name ?? '',
        updated_by: updator.user_name ?? '',
        created_at: toDate(item.createdAt),
        updated_at: toDate(item.updatedAt),
      });
    }


    const fileName = `Canvas_Done_Report_${Date.now()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel generation error:', err);
    throw new ApiError(500, err.message);
  }
};
