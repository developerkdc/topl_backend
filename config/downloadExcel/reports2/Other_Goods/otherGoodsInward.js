import ExcelJS from 'exceljs';
import fs from 'fs/promises';

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        return 'N/A';
    }
};

/**
 * Generate OtherGoods Inward Report
 */
const GenerateOtherGoodsInwardReport = async (details, startDate, endDate) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OtherGoods Inward Report');

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    console.log('Generating OtherGoods inward report for range:', formattedStartDate, 'to', formattedEndDate);

    let currentRow = 1;
    // Row 1: Date Range title
    worksheet.mergeCells(currentRow, 1, currentRow, 6);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = `Store Inward Report Date: ${formattedStartDate} to ${formattedEndDate}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow++;

    // Row 2  
    const headers = [
        { name: 'Sr. No', key: 'sr_no', width: 8 },
        { name: 'Supplier Name', key: 'supplier_name', width: 30 },
        { name: 'Inv. No/Challan N', key: 'invoice_no', width: 20 },
        { name: 'Inv./Challan Date', key: 'invoice_date', width: 15 },
        { name: 'Item Name', key: 'item_name', width: 30 },
        { name: 'Department', key: 'department', width: 20 },
        { name: 'Machine', key: 'machine', width: 20 },
        { name: 'Qty', key: 'qty', width: 10 },
        { name: 'Rate', key: 'rate', width: 12 },
        { name: 'Value', key: 'value', width: 15 },
        { name: 'Gst', key: 'gst', width: 10 }, // Merged
        { name: 'Total Gst', key: 'total_gst', width: 12 },
        { name: 'Remark', key: 'remark', width: 20 },
        { name: 'Authorised', key: 'authorised', width: 15 }
    ];

    // Row 3 (Upper Header)
    const headerRow1 = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
        const colIndex = index + 1;
        if (header.name === 'Gst') {
            worksheet.mergeCells(currentRow, 11, currentRow, 13);
            const cell = worksheet.getCell(currentRow, 11);
            cell.value = 'Gst';
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
            const cell = headerRow1.getCell(colIndex > 10 ? colIndex + 2 : colIndex);
            cell.value = header.name;
            worksheet.mergeCells(currentRow, colIndex > 10 ? colIndex + 2 : colIndex, currentRow + 1, colIndex > 10 ? colIndex + 2 : colIndex);
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
    });
    currentRow++;

    // Row 4 (Lower Header for GST)
    const headerRow2 = worksheet.getRow(currentRow);
    headerRow2.getCell(11).value = 'Cgst';
    headerRow2.getCell(12).value = 'Sgst';
    headerRow2.getCell(13).value = 'Igst';
    headerRow2.getCell(11).alignment = { horizontal: 'center' };
    headerRow2.getCell(12).alignment = { horizontal: 'center' };
    headerRow2.getCell(13).alignment = { horizontal: 'center' };

    // Apply borders and font to header rows
    [currentRow - 1, currentRow].forEach(rowNum => {
        const row = worksheet.getRow(rowNum);
        for (let i = 1; i <= 16; i++) {
            const cell = row.getCell(i);
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        }
    });
    currentRow++;

    // Set column widths
    worksheet.columns = [
        { width: 8 },  // Sr. No
        { width: 30 }, // Supplier Name
        { width: 20 }, // Inv. No
        { width: 15 }, // Inv. Date
        { width: 30 }, // Item Name
        { width: 20 }, // Department
        { width: 20 }, // Machine
        { width: 10 }, // Qty
        { width: 12 }, // Rate
        { width: 15 }, // Value
        { width: 10 }, // Cgst
        { width: 10 }, // Sgst
        { width: 10 }, // Igst
        { width: 15 }, // Total Gst
        { width: 20 }, // Remark
        { width: 15 }, // Authorised
    ];

    let totalAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGstValue = 0;

    // Add data rows
    details.forEach((item, index) => {
        const row = worksheet.getRow(currentRow);

        row.getCell(1).value = index + 1;
        row.getCell(2).value = item?.othergoods_invoice_details?.supplier_details?.company_details?.supplier_name || '';
        row.getCell(3).value = item?.othergoods_invoice_details?.invoice_Details?.invoice_no || item?.othergoods_invoice_details?.inward_sr_no || '';
        row.getCell(4).value = formatDate(item?.othergoods_invoice_details?.invoice_Details?.invoice_date || item?.othergoods_invoice_details?.inward_date);
        row.getCell(5).value = item.item_name || '';
        row.getCell(6).value = item.department_name || '';
        row.getCell(7).value = item.machine_name || '';
        row.getCell(8).value = item.total_quantity || 0;
        row.getCell(9).value = item.rate_in_inr || 0;
        row.getCell(10).value = item.amount || 0;
        row.getCell(11).value = item.cgst_value || 0;
        row.getCell(12).value = item.sgst_value || 0;
        row.getCell(13).value = item.igst_value || 0;
        row.getCell(14).value = (item.cgst_value || 0) + (item.sgst_value || 0) + (item.igst_value || 0);
        row.getCell(15).value = item.remark || '';
        row.getCell(16).value = item.approved_by || ''; // Authorised placeholder

        // Apply borders and alignment
        for (let i = 1; i <= 16; i++) {
            const cell = row.getCell(i);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            if ([1, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(i)) {
                cell.alignment = { horizontal: 'right' };
            } else {
                cell.alignment = { horizontal: 'left' };
            }
        }

        totalAmount += item.amount || 0;
        totalCgst += item.cgst_value || 0;
        totalSgst += item.sgst_value || 0;
        totalIgst += item.igst_value || 0;
        totalGstValue += (item.cgst_value || 0) + (item.sgst_value || 0) + (item.igst_value || 0);

        currentRow++;
    });

    // Add Total Row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(7).value = 'Total';
    totalRow.getCell(7).font = { bold: true };

    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16].forEach(col => {
        const cell = totalRow.getCell(col);
        cell.font = { bold: true };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    totalRow.getCell(10).value = totalAmount;
    totalRow.getCell(11).value = totalCgst;
    totalRow.getCell(12).value = totalSgst;
    totalRow.getCell(13).value = totalIgst;
    totalRow.getCell(14).value = totalGstValue;

    // Generate file path
    const timestamp = new Date().getTime();
    const fileName = `other_goods_inward_report_${timestamp}.xlsx`;
    const dirPath = 'public/reports/OtherGoods';
    const filePath = `${dirPath}/${fileName}`;

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Save the workbook
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;

    return downloadLink;
};

export { GenerateOtherGoodsInwardReport };
