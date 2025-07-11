import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/ApiError.js';

export const createFactoryBunitoDamageExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory-Bunito-Done-Report');

    // Define worksheet columns
    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued From', key: 'issued_from', width: 15 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Issue Status', key: 'issue_status', width: 15 },
      { header: 'Product Type', key: 'product_type', width: 15 },
      { header: 'Group No', key: 'group_no', width: 15 },
      { header: 'Pressing ID', key: 'pressing_id', width: 15 },
      { header: 'Pressing Instructions', key: 'pressing_instructions', width: 30 },
      { header: 'Pressing Date', key: 'pressing_date', width: 18 },
      { header: 'Bunito Date', key: 'bunito_date', width: 18 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
      { header: 'Bunito Sheets', key: 'bunito_sheets', width: 15 },
      { header: 'Bunito SQM', key: 'bunito_sqm', width: 15 },
      { header: 'Order No', key: 'order_no', width: 12 },
      { header: 'Order Category', key: 'order_category', width: 18 },
      { header: 'Customer Name', key: 'customer_name', width: 25 },
      { header: 'Series Code', key: 'series_product_code', width: 20 },
      { header: 'Flow Process', key: 'flow_process', width: 30 },
      { header: 'Base Items', key: 'base_items', width: 30 },
      { header: 'Face Items', key: 'face_items', width: 30 },
      { header: 'Group Item Names', key: 'group_items', width: 30 },
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Updated By', key: 'updated_by', width: 20 },
    ];

    // Convert newData object with numeric keys to array
    const dataArray = Object.values(newData);

    // Populate worksheet rows
    for (const item of dataArray) {
      const bunitoDetails = item.bunito_done_details || {};
      const pressingDetails = item?.issue_for_bunito_details?.pressing_details || {};
      const orderDetails = item?.issue_for_bunito_details?.order_details || {};

      const pressingConsumed = item?.issue_for_bunito_details?.pressing_done_consumed_items_details || [];

      // Base items
      const baseItems = pressingConsumed.flatMap(d =>
        d.base_details?.map(b => b.item_name)
      ) || [];

      // Face items
      const faceItems = pressingConsumed.flatMap(d =>
        d.face_details?.map(f => f.item_name)
      ) || [];

      // Group items
      const groupItems = pressingConsumed.flatMap(d =>
        d.group_details?.map(g => g.item_name)
      ) || [];

      worksheet.addRow({
        sr_no: item?.sr_no,
        issued_from: item?.issue_for_bunito_details?.issued_from || '',
        issued_for: item?.issue_for_bunito_details?.issued_for || '',
        issue_status: item?.issue_status || '',
        product_type: pressingDetails?.product_type || '',
        group_no: pressingDetails?.group_no || '',
        pressing_id: pressingDetails?.pressing_id || '',
        pressing_instructions: pressingDetails?.pressing_instructions || '',
        pressing_date: pressingDetails?.pressing_date
          ? new Date(pressingDetails.pressing_date).toLocaleDateString()
          : '',
        bunito_date: bunitoDetails?.bunito_date
          ? new Date(bunitoDetails.bunito_date).toLocaleDateString()
          : '',
        issued_sheets: item?.issue_for_bunito_details?.issued_sheets || '',
        issued_sqm: item?.issue_for_bunito_details?.issued_sqm || '',
        bunito_sheets: item?.no_of_sheets || '',
        bunito_sqm: item?.sqm || '',
        order_no: orderDetails?.order_no || '',
        order_category: orderDetails?.order_category || '',
        customer_name: orderDetails?.owner_name || '',
        series_product_code: pressingDetails?.series_product_code || '',
        flow_process: pressingDetails?.flow_process?.join(', ') || '',
        base_items: baseItems.join(', '),
        face_items: faceItems.join(', '),
        group_items: groupItems.join(', '),
        created_by: item?.created_by?.user_name || '',
        updated_by: item?.updated_by?.user_name || '',
      });
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Factory-Bunito-Damage-Report.xlsx');

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.status(200).end();

  } catch (error) {
    console.error(error);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
