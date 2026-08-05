import exceljs from 'exceljs';
import ApiError from '../../../../../utils/errors/apiError.js';

const MAX_EXCEL_DATA_ROWS_PER_SHEET = 1048575;
const DEFAULT_SHEET_NAME = 'venner-logs';

export const veneerBaseExportProjection = {
  _id: 1,
  invoice_id: 1,
  supplier_item_name: 1,
  item_sr_no: 1,
  item_name: 1,
  item_sub_category_name: 1,
  log_code: 1,
  bundle_number: 1,
  pallet_number: 1,
  length: 1,
  width: 1,
  thickness: 1,
  number_of_leaves: 1,
  total_sq_meter: 1,
  cut_name: 1,
  series_name: 1,
  grades_name: 1,
  rate_in_currency: 1,
  rate_in_inr: 1,
  exchange_rate: 1,
  amount: 1,
  remark: 1,
  createdAt: 1,
  updatedAt: 1,
};

export const veneerInvoiceExportProjection = {
  _id: 1,
  inward_sr_no: 1,
  inward_date: 1,
  currency: 1,
  'workers_details.no_of_workers': 1,
  'workers_details.shift': 1,
  'workers_details.working_hours': 1,
  'supplier_details.company_details.supplier_name': 1,
  'supplier_details.company_details.supplier_type': 1,
  'supplier_details.branch_detail.branch_name': 1,
  'supplier_details.branch_detail.address': 1,
  'supplier_details.branch_detail.city': 1,
  'supplier_details.branch_detail.state': 1,
  'supplier_details.branch_detail.country': 1,
  'supplier_details.branch_detail.pincode': 1,
  'supplier_details.branch_detail.gst_number': 1,
  'supplier_details.branch_detail.web_url': 1,
  'supplier_details.branch_detail.contact_person': 1,
  'invoice_Details.invoice_date': 1,
  'invoice_Details.invoice_no': 1,
  'invoice_Details.total_item_amount': 1,
  'invoice_Details.transporter_details': 1,
  'invoice_Details.gst_percentage': 1,
  'invoice_Details.gst_value': 1,
  'invoice_Details.invoice_value_with_gst': 1,
  'invoice_Details.remark': 1,
  'invoice_Details.port_of_loading': 1,
  'invoice_Details.port_of_discharge': 1,
  'invoice_Details.bill_of_landing': 1,
  'invoice_Details.freight': 1,
  'invoice_Details.isFreightInclude': 1,
  'invoice_Details.load_unload': 1,
  'invoice_Details.isLoadUnloadInclude': 1,
};

const veneerColumns = [
  { header: 'Inward Sr No', key: 'inward_sr_no', width: 15 },
  { header: 'Inward Date', key: 'inward_date', width: 20 },
  { header: 'Veneer Sr No', key: 'veneer_sr_no', width: 15 },
  { header: 'Item Name', key: 'item_name', width: 20 },
  {
    header: 'Item Sub Category Name',
    key: 'item_sub_category_name',
    width: 20,
  },
  { header: 'Log Code', key: 'log_code', width: 15 },
  { header: 'Bundle Number', key: 'bundle_number', width: 15 },
  { header: 'Pallet Number', key: 'pallet_number', width: 20 },
  { header: 'Length', key: 'length', width: 10 },
  { header: 'Width', key: 'width', width: 10 },
  { header: 'Thickness', key: 'thickness', width: 10 },
  { header: 'Number of Leaves', key: 'number_of_leaves', width: 15 },
  { header: 'Total Sq Meter', key: 'total_sq_meter', width: 15 },
  { header: 'Cut Name', key: 'cut_name', width: 15 },
  { header: 'Series Name', key: 'series_name', width: 15 },
  { header: 'Grade Name', key: 'grades_name', width: 15 },
  { header: 'Rate in Currency', key: 'rate_in_currency', width: 20 },
  { header: 'Rate in INR', key: 'rate_in_inr', width: 20 },
  { header: 'Exchange Rate', key: 'exchange_rate', width: 15 },
  { header: 'GST Value', key: 'gst_val', width: 15 },
  { header: 'Amount', key: 'amount', width: 15 },
  { header: 'Remark', key: 'remark', width: 20 },
  { header: 'Created Date', key: 'createdAt', width: 20 },
  { header: 'Updated Date', key: 'updatedAt', width: 20 },
  { header: 'Currency', key: 'currency', width: 10 },
  { header: 'No of Workers', key: 'no_of_workers', width: 15 },
  { header: 'Shift', key: 'shift', width: 10 },
  { header: 'Working Hours', key: 'working_hours', width: 15 },
  { header: 'Supplier Name', key: 'supplier_name', width: 30 },
  { header: 'Supplier Type', key: 'supplier_type', width: 30 },
  { header: 'Branch Name', key: 'branch_name', width: 25 },
  { header: 'Contact Person Name', key: 'contact_person_name', width: 25 },
  {
    header: 'Contact Person Email',
    key: 'contact_person_email',
    width: 25,
  },
  {
    header: 'Contact Person Mobile Number',
    key: 'contact_person_mobile_number',
    width: 25,
  },
  {
    header: 'Contact Person Designation',
    key: 'contact_person_designation',
    width: 25,
  },
  { header: 'Branch Address', key: 'address', width: 25 },
  { header: 'City', key: 'city', width: 20 },
  { header: 'State', key: 'state', width: 15 },
  { header: 'Country', key: 'country', width: 15 },
  { header: 'Pincode', key: 'pincode', width: 15 },
  { header: 'GST Number', key: 'gst_number', width: 20 },
  { header: 'Web URL', key: 'web_url', width: 25 },
  { header: 'Invoice Date', key: 'invoice_date', width: 20 },
  { header: 'Invoice No', key: 'invoice_no', width: 20 },
  { header: 'Total Item Amount', key: 'total_item_amount', width: 20 },
  { header: 'Transporter Details', key: 'transporter_details', width: 30 },
  { header: 'GST Percentage', key: 'gst_percentage', width: 20 },
  {
    header: 'Invoice Value with GST',
    key: 'invoice_value_with_gst',
    width: 20,
  },
  { header: 'Invoice Remark', key: 'invoice_remark', width: 20 },
  { header: 'Port of Loading', key: 'port_of_loading', width: 25 },
  { header: 'Port of Discharge', key: 'port_of_discharge', width: 25 },
  { header: 'Bill of Lading', key: 'bill_of_landing', width: 25 },
  { header: 'Freight', key: 'freight', width: 15 },
  { header: 'Is Freight Included', key: 'isFreightInclude', width: 20 },
  { header: 'Load Unload', key: 'load_unload', width: 15 },
  {
    header: 'Is Load Unload Included',
    key: 'isLoadUnloadInclude',
    width: 20,
  },
];

const getVeneerExcelRowData = (data) => {
  const primaryContact =
    data?.veneer_invoice_details?.supplier_details?.branch_detail
      ?.contact_person?.[0] || {};

  return {
    inward_sr_no: data?.veneer_invoice_details?.inward_sr_no,
    inward_date: data?.veneer_invoice_details?.inward_date,
    supplier_item_name: data?.supplier_item_name,
    item_sr_no: data?.item_sr_no,
    veneer_sr_no: data?.item_sr_no,
    item_name: data?.item_name,
    item_sub_category_name: data?.item_sub_category_name,
    log_code: data?.log_code,
    bundle_number: data?.bundle_number,
    pallet_number: data?.pallet_number,
    length: data?.length,
    width: data?.width,
    thickness: data?.thickness,
    number_of_leaves: data?.number_of_leaves,
    total_sq_meter: data?.total_sq_meter,
    cut_name: data?.cut_name,
    series_name: data?.series_name,
    grades_name: data?.grades_name,
    rate_in_currency: data?.rate_in_currency,
    rate_in_inr: data?.rate_in_inr,
    exchange_rate: data?.exchange_rate,
    gst_val: data?.veneer_invoice_details?.invoice_Details?.gst_value,
    amount: data?.amount,
    remark: data?.remark,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
    currency: data?.veneer_invoice_details?.currency,
    no_of_workers:
      data?.veneer_invoice_details?.workers_details?.no_of_workers,
    shift: data?.veneer_invoice_details?.workers_details?.shift,
    working_hours:
      data?.veneer_invoice_details?.workers_details?.working_hours,
    supplier_name:
      data?.veneer_invoice_details?.supplier_details?.company_details
        ?.supplier_name,
    supplier_type:
      data?.veneer_invoice_details?.supplier_details?.company_details?.supplier_type?.join(
        ', '
      ),
    branch_name:
      data?.veneer_invoice_details?.supplier_details?.branch_detail
        ?.branch_name,
    address:
      data?.veneer_invoice_details?.supplier_details?.branch_detail?.address,
    city: data?.veneer_invoice_details?.supplier_details?.branch_detail?.city,
    state:
      data?.veneer_invoice_details?.supplier_details?.branch_detail?.state,
    country:
      data?.veneer_invoice_details?.supplier_details?.branch_detail?.country,
    pincode:
      data?.veneer_invoice_details?.supplier_details?.branch_detail?.pincode,
    gst_number:
      data?.veneer_invoice_details?.supplier_details?.branch_detail
        ?.gst_number,
    web_url:
      data?.veneer_invoice_details?.supplier_details?.branch_detail?.web_url,
    contact_person_name: primaryContact?.name,
    contact_person_email: primaryContact?.email,
    contact_person_designation: primaryContact?.designation,
    contact_person_mobile_number: primaryContact?.mobile_number,
    invoice_date: data?.veneer_invoice_details?.invoice_Details?.invoice_date,
    invoice_no: data?.veneer_invoice_details?.invoice_Details?.invoice_no,
    total_item_amount:
      data?.veneer_invoice_details?.invoice_Details?.total_item_amount,
    transporter_details:
      data?.veneer_invoice_details?.invoice_Details?.transporter_details,
    gst_percentage:
      data?.veneer_invoice_details?.invoice_Details?.gst_percentage,
    invoice_value_with_gst:
      data?.veneer_invoice_details?.invoice_Details?.invoice_value_with_gst,
    invoice_remark: data?.veneer_invoice_details?.invoice_Details?.remark,
    port_of_loading:
      data?.veneer_invoice_details?.invoice_Details?.port_of_loading,
    port_of_discharge:
      data?.veneer_invoice_details?.invoice_Details?.port_of_discharge,
    bill_of_landing:
      data?.veneer_invoice_details?.invoice_Details?.bill_of_landing,
    freight: data?.veneer_invoice_details?.invoice_Details?.freight,
    isFreightInclude:
      data?.veneer_invoice_details?.invoice_Details?.isFreightInclude,
    load_unload: data?.veneer_invoice_details?.invoice_Details?.load_unload,
    isLoadUnloadInclude:
      data?.veneer_invoice_details?.invoice_Details?.isLoadUnloadInclude,
  };
};

const createWorksheet = (workbook, sheetName) => {
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = veneerColumns;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });
  worksheet.getRow(1).commit();
  return worksheet;
};

const getSheetName = (sheetIndex) =>
  sheetIndex === 1 ? DEFAULT_SHEET_NAME : `${DEFAULT_SHEET_NAME}-${sheetIndex}`;

const getDownloadFileName = (fileNamePrefix = 'VENNER-Inventory-report') =>
  `${fileNamePrefix}-${Date.now()}.xlsx`;

const closeAsyncSource = async (source) => {
  if (typeof source?.return === 'function') {
    await source.return();
    return;
  }

  if (typeof source?.close === 'function') {
    await source.close();
  }
};

export const streamVeneerLogsExcel = async ({
  res,
  rowSource,
  fileNamePrefix = 'VENNER-Inventory-report',
}) => {
  const iterator = rowSource?.[Symbol.asyncIterator]?.();

  if (!iterator) {
    throw new ApiError('Invalid export source', 500);
  }

  let workbook;

  try {
    const firstRow = await iterator.next();

    if (firstRow.done) {
      throw new ApiError('NO Data found...', 404);
    }

    const fileName = getDownloadFileName(fileNamePrefix);
    res.status(200);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    workbook = new exceljs.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: false,
    });

    let sheetIndex = 1;
    let dataRowsInSheet = 0;
    let worksheet = createWorksheet(workbook, getSheetName(sheetIndex));

    const writeRow = (row) => {
      if (dataRowsInSheet >= MAX_EXCEL_DATA_ROWS_PER_SHEET) {
        worksheet.commit();
        sheetIndex += 1;
        dataRowsInSheet = 0;
        worksheet = createWorksheet(workbook, getSheetName(sheetIndex));
      }

      worksheet.addRow(getVeneerExcelRowData(row)).commit();
      dataRowsInSheet += 1;
    };

    writeRow(firstRow.value);

    while (true) {
      const nextRow = await iterator.next();
      if (nextRow.done) break;
      writeRow(nextRow.value);
    }

    worksheet.commit();
    await workbook.commit();
  } catch (error) {
    await closeAsyncSource(iterator);

    if (!res.headersSent) {
      throw new ApiError(error.message, error.statusCode || 500);
    }

    res.destroy(error);
  }
};
