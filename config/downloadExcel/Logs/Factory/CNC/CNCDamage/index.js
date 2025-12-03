// import exceljs from 'exceljs';
// import ApiError from '../../../../../../utils/errors/apiError.js';

// export const createFactoryCNCDamageExcel = async (newData, req, res) => {
//   try {
//     const workbook = new exceljs.Workbook();
//     const worksheet = workbook.addWorksheet('Factory-CNC-Done-Report');

//     // Define worksheet columns
//     worksheet.columns = [
//       { header: 'Sr. No', key: 'sr_no', width: 8 },
//       { header: 'Issued From', key: 'issued_from', width: 18 },
//       { header: 'Issued For', key: 'issued_for', width: 15 },
//       { header: 'Product Type', key: 'product_type', width: 15 },
//       { header: 'Group No', key: 'group_no', width: 15 },
//       { header: 'Item Name', key: 'base_items', width: 25 },
//       { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
//       { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
//       { header: 'Pressing Date', key: 'pressing_date', width: 18 },
//       { header: 'CNC Date', key: 'cnc_date', width: 18 },
//       { header: 'CNC Sheets', key: 'cnc_sheets', width: 15 },
//       { header: 'CNC SQM', key: 'cnc_sqm', width: 15 },
//       { header: 'Order No', key: 'order_no', width: 12 },
//       { header: 'Customer Name', key: 'customer_name', width: 25 },
//       { header: 'Item', key: 'item', width: 25 },
//       { header: 'Item Remark', key: 'item_remark', width: 30 }
//     ];

//     // Convert newData object with numeric keys to an array
//     const dataArray = Object.values(newData);

//     // Populate worksheet rows
//     for (const item of dataArray) {
//       const pressingDetails = item?.issue_for_cnc_details?.pressing_details || {};
//       const orderDetails = item?.issue_for_cnc_details?.order_details || {};
//       const orderItemDetails = item?.issue_for_cnc_details?.order_item_details || {};
//       const cncDetails = item?.cnc_done_details || {};
//       const customerName = orderDetails?.owner_name || '';

//       const baseItems = item.issue_for_cnc_details?.pressing_done_consumed_items_details
//         ?.flatMap(d => d.base_details?.map(b => b.item_name)) || [];

//       worksheet.addRow({
//         sr_no: item.sr_no,
//         issued_from: item.issue_for_cnc_details?.issued_from || '',
//         issued_for: item.issue_for_cnc_details?.issued_for || '',
//         product_type: pressingDetails.product_type || '',
//         group_no: pressingDetails.group_no || '',
//         base_items: baseItems.join(', '),
//         issued_sheets: item.issue_for_cnc_details?.issued_sheets || '',
//         issued_sqm: item.issue_for_cnc_details?.issued_sqm || '',
//         pressing_date: pressingDetails.pressing_date
//           ? new Date(pressingDetails.pressing_date).toLocaleDateString()
//           : '',
//         cnc_date: cncDetails.cnc_date
//           ? new Date(cncDetails.cnc_date).toLocaleDateString()
//           : '',
//         cnc_sheets: item.no_of_sheets || '',
//         cnc_sqm: item.sqm || '',
//         order_no: orderDetails.order_no || '',
//         customer_name: customerName,
//         item: orderItemDetails?.item_name || '',
//         item_remark: orderItemDetails?.remark || '',
//       });
//     }

//     // Set response headers
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename=Factory-CNC-Damage-Report.xlsx');

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

export const createFactoryCNCDamageExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory-CNC‑Damage-Report');

    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 18 }, // not in grid but useful
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Item Name', key: 'item_name', width: 24 },
      { header: 'Item Sub Category', key: 'item_sub_category', width: 18 },
      { header: 'CNC Date', key: 'cnc_date', width: 14 },
      { header: 'Order Date', key: 'order_date', width: 15 },
      { header: 'Customer Name', key: 'owner_name', width: 20 },
      { header: 'Order No', key: 'order_no', width: 14 },
      { header: 'Item No', key: 'item_no', width: 12 },
      { header: 'Series Product', key: 'series_product', width: 18 },
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Photo No', key: 'photo_no', width: 12 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 12 },
      { header: 'Damage Sheets', key: 'damage_sheets', width: 15 },
      { header: 'Damage SQM', key: 'damage_sqm', width: 15 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 13 },
      { header: 'CNC Sheets', key: 'cnc_sheets', width: 13 },
      { header: 'CNC SQM', key: 'cnc_sqm', width: 13 },
      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Pressing Date', key: 'pressing_date', width: 15 },
      { header: 'Item Remark', key: 'item_remark', width: 25 },
      /* -------------- audit -------------------------------------- */
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Updated By', key: 'updated_by', width: 18 },
      { header: 'Created At', key: 'createdAt', width: 15 },
      { header: 'Updated At', key: 'updatedAt', width: 15 }
    ];

    worksheet.getRow(1).eachCell(cell => (cell.font = { bold: true }));

    Object.values(newData).forEach(item => {
      const issue = item.issue_for_cnc_details || {};
      const order = issue.order_details || {};
      const orderItem = issue.order_item_details || {};
      const press = issue.pressing_details || {};
      const groupDet = issue.pressing_done_consumed_items_details?.[0]?.group_details?.[0] || {};
      const cncDone = item.cnc_done_details || {};

      worksheet.addRow({
        sr_no: item.sr_no,
        issued_from: issue.issued_from || '',
        issued_for: issue.issued_for || '',
        item_name: groupDet.item_name || '',
        item_sub_category: groupDet.item_sub_category_name || '',
        cnc_date: cncDone.cnc_date ? new Date(cncDone.cnc_date).toLocaleDateString() : '',
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
        damage_sheets: item.no_of_sheets || '',
        damage_sqm: item.sqm || '',
        issued_sheets: issue.issued_sheets || '',
        issued_sqm: issue.issued_sqm || '',
        cnc_sheets: item.no_of_sheets || '',
        cnc_sqm: item.sqm || '',
        product_type: press.product_type || '',
        pressing_date: press.pressing_date ? new Date(press.pressing_date).toLocaleDateString() : '',
        item_remark: orderItem.remark || '',
        /* audit ----------------------------------------------- */
        created_by: item.created_by?.user_name ||
          `${item.created_by?.first_name || ''} ${item.created_by?.last_name || ''}`.trim(),
        updated_by: item.updated_by?.user_name ||
          `${item.updated_by?.first_name || ''} ${item.updated_by?.last_name || ''}`.trim(),
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '',
      });
    });


    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Factory-CNC-Damage-Report_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
