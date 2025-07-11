// import ExcelJS from 'exceljs';
// import convDate from '../../../../../utils/date/date.js';

// const GenerateIssuedForGroupingLogs = async (details) => {
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet('Issued For Grouping Logs');

//   // Add headers to the worksheet
//   const headers = [
//     { header: 'Date', key: 'date', width: 20 },
//     { header: 'Operation Type', key: 'operationType', width: 20 },
//     { header: 'Done By', key: 'created_by', width: 30 },
//     { header: 'Invoice No', key: 'invoice_no', width: 20 },
//     { header: 'Date of Inward', key: 'date_of_inward', width: 20 },
//     { header: 'Status', key: 'status', width: 15 },
//     { header: 'Item Name', key: 'item_name', width: 30 },
//     { header: 'Item Code', key: 'item_code', width: 15 },
//     { header: 'Item Log No', key: 'item_log_no', width: 20 },
//     { header: 'Item Bundle No', key: 'item_bundle_no', width: 20 },
//     { header: 'Item Length', key: 'item_length', width: 15 },
//     { header: 'Item Width', key: 'item_width', width: 15 },
//     {
//       header: 'Item Available Pattas',
//       key: 'item_available_pattas',
//       width: 20,
//     },
//     // {
//     //   header: "Item Issued Pattas",
//     //   key: "issued_smoking_quantity",
//     //   width: 20,
//     // },
//     { header: 'Item Available SQM', key: 'item_available_sqm', width: 20 },

//     { header: 'Item Pallete No', key: 'item_pallete_no', width: 15 },
//     {
//       header: 'Item Physical Location',
//       key: 'item_physical_location',
//       width: 20,
//     },
//     { header: 'Item Grade', key: 'item_grade', width: 15 },
//     { header: 'Item Rate Per SQM', key: 'item_rate_per_sqm', width: 20 },
//     { header: 'Item Remark', key: 'item_remark', width: 30 },
//   ];
//   worksheet.columns = headers.map((header) => {
//     return {
//       header: header.header.toUpperCase(), // Convert to uppercase
//       key: header.key,
//       width: header.width,
//     };
//   });
//   details.forEach((log) => {
//     const row = worksheet.addRow({
//       date: convDate(log.date),
//       operationType: log.data.operationType,
//       created_by: `${log.created_user_id.first_name} ${log.created_user_id.last_name} `,
//       invoice_no: log.data.fullDocument.item_id.invoice_no,
//       date_of_inward: convDate(log.data.fullDocument.item_id.date_of_inward),
//       status: 'issue for grouping',
//       item_name: log.data.fullDocument.item_id.item_name,
//       item_code: log.data.fullDocument.item_id.item_code,
//       item_log_no: log.data.fullDocument.item_id.item_log_no,
//       item_bundle_no: log.data.fullDocument.item_id.item_bundle_no,
//       item_length: log.data.fullDocument.item_id.item_length,
//       item_width: log.data.fullDocument.item_id.item_width,
//       item_available_pattas:
//         log.data.fullDocument.item_id.item_available_pattas,
//       item_available_sqm: log.data.fullDocument.item_id.item_available_sqm,
//       item_pallete_no: log.data.fullDocument.item_id.item_pallete_no,
//       item_physical_location:
//         log.data.fullDocument.item_id.item_physical_location,
//       item_grade: log.data.fullDocument.item_id.item_grade,
//       item_rate_per_sqm: log.data.fullDocument.item_id.item_rate_per_sqm,
//       item_remark: log.data.fullDocument.item_id.item_remark,
//     });
//     row.eachCell({ includeEmpty: true }, (cell) => {
//       cell.alignment = { horizontal: 'left' };
//     });
//   });

//   // Add totals row
//   const headerRow = worksheet.getRow(1);
//   headerRow.font = { bold: true };

//   const buffer = await workbook.xlsx.writeBuffer();
//   return buffer;
// };

// export { GenerateIssuedForGroupingLogs };
import exceljs from 'exceljs';
import ApiError from '../../../../../utils/errors/apiError.js';
export const createFactoryIssueForGroupingExcel = async (details, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Issue Report');

    // Define headers
    const headers = [
      { header: 'Sr. No', key: 'sr_no', width: 10 },
      { header: 'Issues From', key: 'issued_from', width: 30 },
      { header: 'Item Name', key: 'item_name', width: 30 },
      { header: 'Item SubCategory', key: 'item_subcategory', width: 30 },
      { header: 'Pallet No', key: 'pallet_no', width: 30 },
      { header: 'No Of Bundle', key: 'no_of_bundle', width: 20 },
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
    // let srNo = 1;
    // console.log('details: ', details);
    details.forEach((log) => {
      const bundle = log?.bundles_details?.[0]; // Assuming first bundle for now

      if (!bundle) return;
      // console.log('bundle: ', bundle);
      const createdBy = bundle?.created_by || {};
      const updatedBy = bundle?.updated_by || {};

      const row = worksheet.addRow({
        // sr_no: srNo++,
        issued_from: log?.issued_from || '',
        item_name: bundle?.item_name || '',
        item_subcategory: bundle?.item_sub_category_name || '',
        pallet_no: bundle?.pallet_number || '',
        no_of_bundle: log?.total_bundles || '',
        created_by:
          // `${createdBy?.first_name || ''} ${createdBy?.last_name || ''}`.trim(),
          `${createdBy?.user_name || ''}`.trim(),
        updated_by: `${updatedBy?.user_name || ''}`.trim(),
        created_date: bundle?.createdAt
          ? new Date(bundle.createdAt).toLocaleDateString()
          : '',
        updated_date: bundle?.updatedAt
          ? new Date(bundle.updatedAt).toLocaleDateString()
          : '',
      });

      // Left-align all cells
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'left' };
      });
    });

    // Generate dynamic filename
    const timestamp = Date.now();
    const fileName = `Issue_Report_${timestamp}.xlsx`;

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
