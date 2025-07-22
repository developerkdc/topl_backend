// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';

// export const createFactoryColorDoneExcel = async (newData, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory-Color-Done-Report');

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
//       { header: 'Is Color Done', key: 'is_color_done', width: 12 },
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
//         is_color_done: issueDetails.is_color_done ? 'Yes' : 'No',
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
//     const fileName = `Color_Done_Report_${timestamp}.xlsx`;

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

export const createFactoryColorDoneExcel = async (newData, req, res) => {
  try {

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Color‑Done‑Report');

    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 18 }, // not in grid, still useful
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 24 },
      { header: 'Item Sub Category', key: 'item_sub_category', width: 20 },
      { header: 'Color Date', key: 'color_date', width: 14 },
      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Owner Name', key: 'owner_name', width: 20 },
      { header: 'Order No', key: 'order_no', width: 14 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 18 },
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 12 },
      { header: 'Color Sheets', key: 'color_sheets', width: 14 },
      { header: 'Available Sheets', key: 'available_sheets', width: 18 },
      { header: 'Color SQM', key: 'color_sqm', width: 13 },
      { header: 'Available SQM', key: 'available_sqm', width: 15 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Available Amount', key: 'available_amount', width: 17 },


      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Is Color Done', key: 'is_color_done', width: 12 },
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Pressing ID', key: 'pressing_id', width: 18 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },
      { header: 'Shift', key: 'shift', width: 8 },
      { header: 'No. of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Working Hours', key: 'working_hours', width: 15 },
      { header: 'Total Hours', key: 'total_hours', width: 15 },
      { header: 'Base Thickness', key: 'base_thickness', width: 15 },
      { header: 'Veneer Thickness', key: 'veneer_thickness', width: 17 },
      { header: 'Total Thickness', key: 'total_thickness', width: 15 },
      { header: 'Pressing Instr.', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 20 },


      { header: 'Remark', key: 'remark', width: 25 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'createdAt', width: 15 },
      { header: 'Updated At', key: 'updatedAt', width: 15 }
    ];

    worksheet.getRow(1).eachCell(cell => (cell.font = { bold: true }));

    Object.values(newData).forEach(item => {
      const issue = item.issue_for_colour_details || {};
      const order = issue.order_details || {};
      const orderItem = issue.order_item_details || {};
      const press = issue.pressing_details || {};
      const groupDet = issue.pressing_done_consumed_items_details?.[0]?.group_details?.[0] || {};
      const available = item.available_details || {};
      const createdUser = item.created_by || {};
      const updatedUser = item.updated_by || {};

      worksheet.addRow({
        sr_no: item.sr_no,
        issued_from: issue.issued_from || '',
        issued_for: issue.issued_for || '',
        item_name: groupDet.item_name || '',
        item_sub_category: groupDet.item_sub_category_name || '',
        color_date: item.color_date ? new Date(item.color_date).toLocaleDateString() : '',
        order_date: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
        owner_name: order.owner_name || '',
        order_no: order.order_no || '',
        item_no: orderItem.item_no || '',
        series_product: order.series_product || '',
        group_no: groupDet.group_no || '',
        photo_no: groupDet.photo_no || '',
        length: press.length || '',
        width: press.width || '',
        thickness: press.thickness || '',
        color_sheets: item.no_of_sheets ?? '',
        available_sheets: available.no_of_sheets ?? '',
        color_sqm: item.sqm ?? '',
        available_sqm: available.sqm ?? '',
        amount: item.amount ?? '',
        available_amount: available.amount ?? '',
        product_type: press.product_type || '',
        is_color_done: issue.is_color_done ? 'Yes' : 'No',
        machine_name: press.machine_name || '',
        pressing_id: press.pressing_id || '',
        pressing_date: press.pressing_date ? new Date(press.pressing_date).toLocaleDateString() : '',
        shift: press.shift || '',
        no_of_workers: press.no_of_workers || '',
        working_hours: press.no_of_working_hours || '',
        total_hours: press.no_of_total_hours || '',
        base_thickness: press.base_thickness || '',
        veneer_thickness: press.veneer_thickness || '',
        total_thickness: press.thickness || '',
        pressing_instructions: press.pressing_instructions || '',
        flow_process: Array.isArray(press.flow_process) ? press.flow_process.join(', ') : '',
        remark: item.remark || '',
        created_by: createdUser.user_name ||
          `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim(),
        updated_by: updatedUser.user_name ||
          `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
      });
    });

    const fileName = `Color_Done_Report_${Date.now()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
