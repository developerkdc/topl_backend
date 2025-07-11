import exceljs from 'exceljs';
import ApiError from '../../../../../../utils/errors/ApiError.js';

export const createFactoryCNCHistoryExcel = async (data, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Factory CNC Damage Details');

    // Define all possible fields
    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Issued For', key: 'issued_for', width: 15 },
      { header: 'Issue Status', key: 'issue_status', width: 15 },
      { header: 'Issued From', key: 'issued_from', width: 20 },
      { header: 'Issued Sheets', key: 'issued_sheets', width: 15 },
      { header: 'Issued SQM', key: 'issued_sqm', width: 15 },
      { header: 'Available Sheets', key: 'available_sheets', width: 18 },
      { header: 'Available SQM', key: 'available_sqm', width: 18 },
      { header: 'CNC Sheets', key: 'cnc_sheets', width: 15 },
      { header: 'CNC SQM', key: 'cnc_sqm', width: 15 },
      { header: 'Order No', key: 'order_no', width: 15 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Order Type', key: 'order_type', width: 20 },
      { header: 'Product Type', key: 'product_type', width: 20 },
      { header: 'Group No', key: 'group_no', width: 15 },
      { header: 'Series Code', key: 'series_code', width: 15 },
      { header: 'Pressing Date', key: 'pressing_date', width: 18 },
      { header: 'Pressing Instructions', key: 'pressing_instructions', width: 25 },
      { header: 'Flow Process', key: 'flow_process', width: 20 },
      { header: 'Pressing Sheets', key: 'pressing_sheets', width: 15 },
      { header: 'Pressing SQM', key: 'pressing_sqm', width: 15 },
      { header: 'Pressing Remark', key: 'pressing_remark', width: 20 },
      { header: 'Base Items', key: 'base_items', width: 40 },
      { header: 'Group Items', key: 'group_items', width: 40 },
      { header: 'Factory Remark', key: 'factory_remark', width: 30 },
      { header: 'Damage Remark', key: 'damage_remark', width: 30 },
    ];

    const rows = [];

    for (const item of Object.values(data)) {
      const cnc = item;
      const issue = cnc.issue_for_cnc_details || {};
      const pressing = issue.pressing_details || {};
      const order = issue.order_details || {};
      const pressingItems = issue.pressing_done_consumed_items_details || [];

      // Base items extraction
      const baseItems = pressingItems.flatMap(p =>
        (p.base_details || []).map(b => `${b.item_name} (${b.base_type}) x ${b.no_of_sheets}`)
      );

      // Group items extraction
      const groupItems = pressingItems.flatMap(p =>
        (p.group_details || []).map(g => `${g.item_name} (${g.group_no}) x ${g.no_of_sheets}`)
      );

      rows.push({
        sr_no: cnc.sr_no ?? '',
        issued_for: cnc.issued_for ?? '',
        issue_status: cnc.issue_status ?? '',
        issued_from: issue.issued_from ?? '',
        issued_sheets: issue.issued_sheets ?? '',
        issued_sqm: issue.issued_sqm ?? '',
        available_sheets: issue.available_details?.no_of_sheets ?? '',
        available_sqm: issue.available_details?.sqm ?? '',
        cnc_sheets: cnc.no_of_sheets ?? '',
        cnc_sqm: cnc.sqm ?? '',
        order_no: order.order_no ?? '',
        customer: order.owner_name ?? '',
        order_type: order.order_type ?? '',
        product_type: pressing.product_type ?? '',
        group_no: pressing.group_no ?? '',
        series_code: pressing.series_product_code ?? '',
        pressing_date: pressing.pressing_date
          ? new Date(pressing.pressing_date).toLocaleDateString()
          : '',
        pressing_instructions: pressing.pressing_instructions ?? '',
        flow_process: (pressing.flow_process || []).join(', '),
        pressing_sheets: pressing.no_of_sheets ?? '',
        pressing_sqm: pressing.sqm ?? '',
        pressing_remark: pressing.remark ?? '',
        base_items: baseItems.join('; '),
        group_items: groupItems.join('; '),
        factory_remark: cnc.factory_remark ?? '',
        damage_remark: cnc.damage_remark ?? '',
      });
    }

    // Write all rows
    rows.forEach(row => worksheet.addRow(row));

    // Response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Factory_CNC_Damage_Full_Report.xlsx');

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error(error);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
