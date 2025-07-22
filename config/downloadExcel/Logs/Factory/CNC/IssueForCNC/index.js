// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/ApiError.js';


// export const createFactoryIssueForCNCExcel = async (newData, req, res,) => {
//   try {

//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('CNC-Issue-Report');

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
//       { header: 'Is CNC Done', key: 'is_cnc_done', width: 12 },
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
//         is_cnc_done: item.is_cnc_done ? 'Yes' : 'No',
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
//     const fileName = `CNC_Issue_Report_${timestamp}.xlsx`;

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

export const createFactoryIssueForCNCExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('CNC-Issue-Report');


    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 18 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 25 },
      { header: 'Item Sub Category', key: 'item_sub_category', width: 18 },


      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Owner Name', key: 'owner_name', width: 20 },
      { header: 'Order No', key: 'order_no', width: 14 },

      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 18 },

      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Photo No', key: 'photo_no', width: 12 },

      { header: 'Pressed Length', key: 'length', width: 10 },
      { header: 'Pressed Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 12 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Available Sheets', key: 'available_sheets', width: 18 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
      { header: 'Available SQM', key: 'available_sqm', width: 15 },
      { header: 'Issued Amount', key: 'issued_amount', width: 15 },
      { header: 'Available Amount', key: 'available_amount', width: 17 },
      { header: 'Is CNC Done', key: 'is_cnc_done', width: 12 },

      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Pressing ID', key: 'pressing_id', width: 18 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },
      { header: 'Shift', key: 'shift', width: 8 },
      { header: 'No. of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Working Hours', key: 'no_of_working_hours', width: 15 },
      { header: 'Total Hours', key: 'no_of_total_hours', width: 15 },
      { header: 'Pressing Instr.', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 20 },


      { header: 'Remark', key: 'remark', width: 20 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'createdAt', width: 15 },
      { header: 'Updated At', key: 'updatedAt', width: 15 }
    ];

    worksheet.getRow(1).eachCell(cell => (cell.font = { bold: true }));


    const flattenedArray = Object.values(newData);

    flattenedArray.forEach(item => {

      const order = item.order_details || {};
      const itemDet = item.order_item_details || {};
      const pressing = item.pressing_details || {};
      const groupDet = item.pressing_done_consumed_items_details?.[0]?.group_details?.[0] || {};
      const available = item.available_details || {};
      const createdUser = item.created_user_details || {};
      const updatedUser = item.updated_user_details || {};

      const createdName = `${createdUser.user_name || createdUser.first_name || ''}`.trim();
      const updatedName = `${updatedUser.user_name || updatedUser.first_name || ''}`.trim();

      worksheet.addRow({
        sr_no: item.sr_no,
        issued_from: item.issued_from,
        issued_for: item.issued_for,
        item_name: groupDet.item_name || '',
        item_sub_category: groupDet.item_sub_category_name || '',
        order_date: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
        owner_name: order.owner_name || '',
        order_no: order.order_no || '',
        item_no: itemDet.item_no || '',
        series_product: order.series_product || '',

        group_no: groupDet.group_no || '',
        photo_no: groupDet.photo_no || '',

        length: pressing.length || '',
        width: pressing.width || '',
        thickness: pressing.thickness || '',

        issued_sheets: item.issued_sheets,
        available_sheets: available.no_of_sheets || '',
        issued_sqm: item.issued_sqm,
        available_sqm: available.sqm || '',
        issued_amount: item.issued_amount,
        available_amount: available.amount || '',

        is_cnc_done: item.is_cnc_done ? 'Yes' : 'No',
        machine_name: pressing.machine_name || '',
        pressing_id: pressing.pressing_id || '',
        pressing_date: pressing.pressing_date
          ? new Date(pressing.pressing_date).toLocaleDateString()
          : '',
        shift: pressing.shift || '',
        no_of_workers: pressing.no_of_workers || '',
        no_of_working_hours: pressing.no_of_working_hours || '',
        no_of_total_hours: pressing.no_of_total_hours || '',
        pressing_instructions: pressing.pressing_instructions || '',
        flow_process: Array.isArray(pressing.flow_process) ? pressing.flow_process.join(', ') : '',

        remark: item.remark?.toUpperCase() || '',
        created_by: createdName,
        updated_by: updatedName,
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
      });
    });

    const timestamp = Date.now();
    const fileName = `CNC_Issue_Report_${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new ApiError(500, error.message);
  }
};
