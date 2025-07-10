import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/ApiError.js';
import ApiResponse from '../../../../../../utils/ApiResponse.js';


export const createFactoryCNCDamageExcel = async (newData, req, res,) => {
  try {

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory-CNC-Done-Report');
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
      { header: 'Is CNC Done', key: 'is_cnc_done', width: 12 },
      { header: 'Machine Name', key: 'machine_name', width: 20 },
      { header: 'Pressing ID', key: 'pressing_id', width: 20 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },
      { header: 'Shift', key: 'shift', width: 10 },
      { header: 'No. of Workers', key: 'no_of_workers', width: 15 },
      { header: 'Working Hours', key: 'no_of_working_hours', width: 15 },
      { header: 'Total Hours', key: 'no_of_total_hours', width: 15 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Base Thickness', key: 'base_thickness', width: 15 },
      { header: 'Veneer Thickness', key: 'veneer_thickness', width: 15 },
      { header: 'Total Thickness', key: 'thickness', width: 15 },
      // { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 20 },
      // { header: 'Group No', key: 'group_no', width: 15 },
      // { header: 'Item Name', key: 'base_items', width: 25 },
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
    });

    const flattenedArray = Object.values(newData);

    flattenedArray.forEach(item => {
      const cncDetails = item.cnc_done_details || {};
      const issueDetails = item.issue_for_cnc_details || {};
      const createdBy = item.created_by || {};

      worksheet.addRow({
        sr_no: item.sr_no,
        issued_from: issueDetails.issued_from || '',
        issued_for: issueDetails.issued_for || '',
        product_type: issueDetails.order_item_details?.product_type || '',
        group_no: issueDetails.order_item_details?.group_no || '',
        base_items: issueDetails.order_item_details?.base_items?.map(b => b.item_name).join(', ') || '',
        issued_sheets: issueDetails.issued_sheets || '',
        issued_sqm: issueDetails.issued_sqm || '',
        issued_amount: issueDetails.issued_amount || '',
        is_cnc_done: issueDetails.is_cnc_done ? 'Yes' : 'No',
        machine_name: cncDetails.machine_name || '',
        pressing_id: cncDetails.pressing_details_id?.toString() || '',
        pressing_date: cncDetails.cnc_date ? new Date(cncDetails.cnc_date).toLocaleDateString() : '',
        shift: cncDetails.shift || '',
        no_of_workers: cncDetails.no_of_workers || '',
        no_of_working_hours: cncDetails.working_hours || '',
        no_of_total_hours: cncDetails.total_hours || '',
        length: issueDetails.order_item_details?.length || '',
        width: issueDetails.order_item_details?.width || '',
        base_thickness: issueDetails.order_item_details?.base_thickness || '',
        veneer_thickness: issueDetails.order_item_details?.veneer_thickness || '',
        thickness: issueDetails.order_item_details?.thickness || '',
        pressing_instructions: issueDetails.order_item_details?.pressing_instructions || '',
        flow_process: Array.isArray(issueDetails.order_item_details?.flow_process)
          ? issueDetails.order_item_details.flow_process.join(', ')
          : '',
        created_by: `${createdBy.first_name || ''} ${createdBy.last_name || ''}`.trim(),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
      });
    });



    const timestamp = Date.now();
    const fileName = `CNC_Done_Report_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    // return res.json(
    //   new ApiResponse(StatusCodes.OK, 'Csv downloaded successfully...')
    // );
    res.end();

  } catch (error) {
    console.error('Excel generation error:', error);
    throw new ApiError(500, error.message);
  }
};


