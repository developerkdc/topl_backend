// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';


// export const createFactoryIssueForCanvasExcel = async (newData, req, res,) => {
//   try {

//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Canvas-Issue-Report');

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
//       { header: 'Working Hours', key: 'no_of_working_hours', width: 15 },
//       { header: 'Total Hours', key: 'no_of_total_hours', width: 15 },
//       { header: 'Length', key: 'length', width: 10 },
//       { header: 'Width', key: 'width', width: 10 },
//       { header: 'Base Thickness', key: 'base_thickness', width: 15 },
//       { header: 'Veneer Thickness', key: 'veneer_thickness', width: 15 },
//       { header: 'Total Thickness', key: 'thickness', width: 15 },
//       // { header: 'Product Type', key: 'product_type', width: 15 },
//       { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
//       { header: 'Flow Process', key: 'flow_process', width: 20 },
//       // { header: 'Group No', key: 'group_no', width: 15 },
//       // { header: 'Item Name', key: 'base_items', width: 25 },
//       { header: 'Created By', key: 'created_by', width: 20 },
//       { header: 'Created At', key: 'createdAt', width: 20 },
//       { header: 'Updated At', key: 'updatedAt', width: 20 }
//     ];

//     worksheet.getRow(1).eachCell(cell => {
//       cell.font = { bold: true };
//     });

//     const flattenedArray = Object.values(newData);

//     flattenedArray.forEach(item => {
//       const pressing = item.pressing_details || {};
//       const baseDetails = item.pressing_done_consumed_items_details?.[0]?.base_details || [];
//       const baseItems = baseDetails.map(b => b.item_name).join(', ');

//       const createdUser = item.created_user_details || {};
//       const fullName = `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim();

//       worksheet.addRow({
//         sr_no: item.sr_no,
//         issued_from: item.issued_from,
//         issued_for: item.issued_for,
//         product_type: pressing.product_type || '',
//         group_no: pressing.group_no || '',
//         base_items: baseItems,
//         issued_sheets: item.issued_sheets,
//         issued_sqm: item.issued_sqm,
//         issued_amount: item.issued_amount,
//         is_canvas_done: item.is_canvas_done ? 'Yes' : 'No',
//         machine_name: pressing.machine_name || '',
//         pressing_id: pressing.pressing_id || '',
//         pressing_date: pressing.pressing_date ? new Date(pressing.pressing_date).toLocaleDateString() : '',
//         shift: pressing.shift || '',
//         no_of_workers: pressing.no_of_workers || '',
//         no_of_working_hours: pressing.no_of_working_hours || '',
//         no_of_total_hours: pressing.no_of_total_hours || '',
//         length: pressing.length || '',
//         width: pressing.width || '',
//         base_thickness: pressing.base_thickness || '',
//         veneer_thickness: pressing.veneer_thickness || '',
//         thickness: pressing.thickness || '',
//         // product_type: pressing.product_type || '',
//         pressing_instructions: pressing.pressing_instructions || '',
//         flow_process: Array.isArray(pressing.flow_process) ? pressing.flow_process.join(', ') : '',
//         // group_no: pressing.group_no || '',
//         // base_items: baseItems,
//         created_by: fullName,
//         createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
//         updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
//       });
//     });



//     const timestamp = Date.now();
//     const fileName = `Canvas_Issue_Report_${timestamp}.xlsx`;

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

//     await workbook.xlsx.write(res);
//     // return res.json(
//     //   new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...')
//     // );
//     res.end();

//   } catch (error) {
//     console.error('Excel generation error:', error);
//     throw new ApiError(500, error.message);
//   }
// };








import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/apiError.js';

export const createFactoryIssueForCanvasExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Canvas‑Issue‑Report');


    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 18 },
      { header: 'Issued For', key: 'issued_for', width: 15 },

      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Customer Name', key: 'customer_name', width: 20 },
      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 15 },

      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Item Name', key: 'base_items', width: 25 },
      { header: 'Item Sub-Category', key: 'item_sub_category', width: 20 },

      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Press. Length', key: 'length', width: 10 },
      { header: 'Press. Width', key: 'width', width: 10 },
      { header: 'Press. Thickness', key: 'thickness', width: 15 },

      { header: 'Issued Sheets', key: 'issued_sheets', width: 13 },
      { header: 'Available Sheets', key: 'available_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
      { header: 'Available SQM', key: 'available_sqm', width: 14 },

      { header: 'Issued Amount', key: 'issued_amount', width: 15 },
      { header: 'Available Amount', key: 'available_amount', width: 15 },

      { header: 'Is Canvas Done', key: 'is_canvas_done', width: 12 },
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Pressing ID', key: 'pressing_id', width: 18 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'No. of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Total Hours', key: 'total_hours', width: 15 },

      { header: 'Base Thickness', key: 'base_thickness', width: 15 },
      { header: 'Veneer Thickness', key: 'veneer_thickness', width: 15 },

      { header: 'Pressing Instr.', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 20 },

      { header: 'Remark', key: 'remark', width: 25 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'created_at', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 15 },
    ];

    worksheet.getRow(1).eachCell(c => (c.font = { bold: true }));


    const toDate = d => (d ? new Date(d).toLocaleDateString() : '');

    for (const item of Object.values(newData ?? {})) {
      const pressing = item.pressing_details ?? {};
      const order = item.order_details ?? {};
      const orderItem = item.order_item_details ?? {};
      const consumed = item.pressing_done_consumed_items_details ?? [];
      const firstGroup = consumed?.[0]?.group_details?.[0] ?? {};

      const baseItems = (consumed?.[0]?.base_details ?? [])
        .map(b => b.item_name)
        .join(', ');

      const creator = item.created_user_details ?? {};
      const updator = item.updated_user_details ?? {};

      worksheet.addRow({
        sr_no: item.sr_no,
        issued_from: item.issued_from,
        issued_for: item.issued_for,

        order_date: toDate(order.orderDate),
        customer_name: order.owner_name ?? '',
        order_no: order.order_no ?? '',
        item_no: orderItem.item_no ?? '',
        series_product: order.series_product ?? '',

        group_no: pressing.group_no ?? '',
        photo_no: firstGroup.photo_no ?? '',
        base_items: baseItems,
        item_sub_category: firstGroup.item_sub_category_name ?? '',

        product_type: pressing.product_type ?? '',
        length: pressing.length ?? '',
        width: pressing.width ?? '',
        thickness: pressing.thickness ?? '',

        issued_sheets: item.issued_sheets ?? '',
        available_sheets: item.available_details?.no_of_sheets ?? '',
        issued_sqm: item.issued_sqm ?? '',
        available_sqm: item.available_details?.sqm ?? '',

        issued_amount: item.issued_amount ?? '',
        available_amount: item.available_details?.amount ?? '',

        is_canvas_done: item.is_canvas_done ? 'Yes' : 'No',
        machine_name: pressing.machine_name ?? '',
        pressing_id: pressing.pressing_id ?? '',
        pressing_date: toDate(pressing.pressing_date),
        shift: pressing.shift ?? '',
        no_of_workers: pressing.no_of_workers ?? '',
        working_hours: pressing.no_of_working_hours ?? '',
        total_hours: pressing.no_of_total_hours ?? '',

        base_thickness: pressing.base_thickness ?? '',
        veneer_thickness: pressing.veneer_thickness ?? '',

        pressing_instructions: pressing.pressing_instructions ?? '',
        flow_process: Array.isArray(pressing.flow_process)
          ? pressing.flow_process.join(', ')
          : '',

        remark: item.remark ?? '',

        created_by: creator.user_name
          ?? `${creator.first_name || ''} ${creator.last_name || ''}`.trim(),
        updated_by: updator.user_name ?? '',
        created_at: toDate(item.createdAt),
        updated_at: toDate(item.updatedAt),
      });
    }


    const fileName = `Canvas_Issue_Report_${Date.now()}.xlsx`;
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
