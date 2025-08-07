import exceljs from 'exceljs';
import ApiError from '../../../../../utils/errors/apiError.js';
export const createFactoryGroupingDamageExcel = async (details, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Damage Report');

    // Define headers
    const headers = [
      { header: 'Photo No', key: 'photo_no', width: 20 },
      { header: 'Group No', key: 'group_no', width: 20 },
      { header: 'Item Name', key: 'item_name', width: 30 },
      { header: 'Item SubCategory', key: 'item_sub_category_name', width: 30 },
      { header: 'Colour', key: 'color_name', width: 30 },
      { header: 'Log No', key: 'log_no_code', width: 20 },
      { header: 'Length', key: 'length', width: 15 },
      { header: 'Width', key: 'width', width: 15 },
      { header: 'Thickness', key: 'thickness', width: 15 },
      { header: 'No Of Sheets', key: 'no_of_sheets', width: 15 },
      {
        header: 'Available No Of Sheets',
        key: 'available_no_of_sheets',
        width: 20,
      },
      { header: 'SQM', key: 'sqm', width: 20 },
      { header: 'Available SQM', key: 'available_sqm', width: 20 },
      { header: 'Pallet No', key: 'pallet_number', width: 20 },
      { header: 'Character', key: 'character_name', width: 20 },
      { header: 'Pattern', key: 'pattern_name', width: 20 },
      { header: 'Series', key: 'series_name', width: 20 },
      { header: 'Grade', key: 'grade_name', width: 20 },
      { header: 'Amount', key: 'amount', width: 20 },
      { header: 'Available Amount', key: 'available_amount', width: 20 },
      { header: 'Remark', key: 'remark', width: 20 },
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Updated By', key: 'updated_by', width: 20 },
      { header: 'Created Date', key: 'created_date', width: 20 },
      { header: 'Updated Date', key: 'updated_date', width: 20 },
    ];

    // Set worksheet columns
    worksheet.columns = headers.map((header) => ({
      header: header.header.toUpperCase(),
      key: header.key,
      width: header.width,
    }));

    // Make header row bold
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Populate data rows
    details.forEach((item) => {
      const createdBy = item?.created_user_details?.user_name || '';
      const updatedBy = item?.updated_user_details?.user_name || '';

      const row = worksheet.addRow({
        photo_no: item?.photo_no || '',
        group_no: item?.group_no || '',
        item_name: item?.item_name || '',
        item_sub_category_name: item?.item_sub_category_name || '',
        color_name: item?.color_name || '',
        log_no_code: item?.log_no_code || '',
        length: item?.length || '',
        width: item?.width || '',
        thickness: item?.thickness || '',
        no_of_sheets: item?.no_of_sheets || '',
        available_no_of_sheets: item?.available_details?.no_of_sheets ?? '',
        sqm: item?.sqm || '',
        available_sqm: item?.available_details?.sqm ?? '',
        pallet_number: item?.pallet_number || '',
        character_name: item?.character_name || '',
        pattern_name: item?.pattern_name || '',
        series_name: item?.series_name || '',
        grade_name: item?.grade_name || '',
        amount: item?.amount || '',
        available_amount: item?.available_details?.amount ?? '',
        remark: item?.remark || '',
        created_by: createdBy,
        updated_by: updatedBy,
        created_date: item?.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : '',
        updated_date: item?.updatedAt
          ? new Date(item.updatedAt).toLocaleDateString()
          : '',
      });

      // Left-align all cells
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'left' };
      });
    });

    // Generate dynamic filename
    const timestamp = Date.now();
    const fileName = `Grouping_Damage_Report_${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to generate Excel report' });
  }
};
