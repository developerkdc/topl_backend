// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/ApiError.js';


// export const createFactoryColorDoneExcel = async (newData, req, res,) => {
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

//    flattenedArray.forEach(item => {
//   const issueDetails = item.issue_for_color_details || {};
//   const pressing = issueDetails.pressing_details || {};
//   const baseDetails = issueDetails.pressing_done_consumed_items_details?.[0]?.base_details || [];
//   const baseItems = baseDetails.map(b => b.item_name).join(', ');

//   const createdUser = item.created_by || {};
//   const fullName = `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim();

//   worksheet.addRow({
//     sr_no: item.sr_no,
//     issued_from: issueDetails.issued_from || '',
//     issued_for: issueDetails.issued_for || '',
//     product_type: pressing.product_type || '',
//     group_no: pressing.group_no || '',
//     base_items: baseItems,
//     issued_sheets: issueDetails.issued_sheets || '',
//     issued_sqm: issueDetails.issued_sqm || '',
//     issued_amount: issueDetails.issued_amount || '',
//     is_color_done: issueDetails.is_color_done ? 'Yes' : 'No',
//     machine_name: pressing.machine_name || '',
//     pressing_id: item.pressing_details_id?.toString() || '',
//     pressing_date: item.color_date ? new Date(item.color_date).toLocaleDateString() : '',
//     shift: item.shift || '',
//     no_of_workers: item.no_of_workers || '',
//     no_of_working_hours: item.working_hours || '',
//     no_of_total_hours: item.total_hours || '',
//     length: pressing.length || '',
//     width: pressing.width || '',
//     base_thickness: pressing.base_thickness || '',
//     veneer_thickness: pressing.veneer_thickness || '',
//     thickness: pressing.thickness || '',
//     pressing_instructions: pressing.pressing_instructions || '',
//     flow_process: Array.isArray(pressing.flow_process) ? pressing.flow_process.join(', ') : '',
//     created_by: fullName,
//     createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
//     updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
//   });
// });



//     const timestamp = Date.now();
//     const fileName = `Color_Done_Report_${timestamp}.xlsx`;

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

export const createFactoryColorDoneExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory-Color-Done-Report');

    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 18 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Group No', key: 'group_no', width: 15 },
      { header: 'Item Name', key: 'base_items', width: 25 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 12 },
      { header: 'Issued Amount', key: 'issued_amount', width: 15 },
      { header: 'Is Color Done', key: 'is_color_done', width: 12 },
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Pressing ID', key: 'pressing_id', width: 20 },
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
      { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 25 },
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    const flattenedArray = Object.values(newData);

    flattenedArray.forEach((item) => {
      const issueDetails = item.issue_for_colour_details || {};
      const pressing = issueDetails.pressing_details || {};
      const baseDetails = issueDetails.pressing_done_consumed_items_details?.[0]?.base_details || [];

      const baseItems = baseDetails.map((base) => base.item_name).join(', ');

      const createdUser = item.created_by || {};
      const fullName = `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim();

      worksheet.addRow({
        sr_no: item.sr_no,
        issued_from: issueDetails.issued_from || '',
        issued_for: issueDetails.issued_for || '',
        product_type: pressing.product_type || '',
        group_no: pressing.group_no || '',
        base_items: baseItems,
        issued_sheets: issueDetails.issued_sheets || '',
        issued_sqm: issueDetails.issued_sqm || '',
        issued_amount: issueDetails.issued_amount || '',
        is_color_done: issueDetails.is_color_done ? 'Yes' : 'No',
        machine_name: pressing.machine_name || '',
        pressing_id: pressing.pressing_id || '',
        pressing_date: pressing.pressing_date ? new Date(pressing.pressing_date).toLocaleDateString() : '',
        shift: pressing.shift || '',
        no_of_workers: pressing.no_of_workers || '',
        working_hours: pressing.no_of_working_hours || '',
        total_hours: pressing.no_of_total_hours || '',
        length: pressing.length || '',
        width: pressing.width || '',
        base_thickness: pressing.base_thickness || '',
        veneer_thickness: pressing.veneer_thickness || '',
        thickness: pressing.thickness || '',
        pressing_instructions: pressing.pressing_instructions || '',
        flow_process: Array.isArray(pressing.flow_process) ? pressing.flow_process.join(', ') : '',
        created_by: fullName,
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
      });
    });

    const timestamp = Date.now();
    const fileName = `Color_Done_Report_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new ApiError(500, error.message);
  }
};
