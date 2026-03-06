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
 * Generate OtherGoods Daily Report
 */
const GenerateOtherGoodsDailyReport = async (details, reportDate) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OtherGoods Daily Report');

    const formattedDate = formatDate(reportDate);
    console.log('Generating OtherGoods daily report for date:', formattedDate);

    let currentRow = 1;
    // Row 1
    worksheet.mergeCells(currentRow, 1, currentRow, 11);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = `Store Daily Report Date: ${formattedDate}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow++;

    // Row 2: Headers
    const headers = [
        'Sr.',
        'Item',
        'Inward id',
        'Department',
        'Machine',
        'Qty',
        'Unit',
        'amount',
    ];

    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });
    currentRow++;

    // Set column widths
    worksheet.columns = [
        { width: 8 },  // Sr.
        { width: 30 }, // Item
        { width: 15 }, // Inward id
        { width: 20 }, // Department
        { width: 20 }, // Machine
        { width: 10 }, // Qty
        { width: 12 }, // Unit
        { width: 15 }, // amount
    ];

    let totalAmount = 0;

    // Add data rows
    details.forEach((item, index) => {
        const row = worksheet.getRow(currentRow);

        // Sr.
        row.getCell(1).value = index + 1;

        // Item
        row.getCell(2).value = item.item_name || '';

        // Inward id
        row.getCell(3).value = item?.othergoods_invoice_details?.invoice_Details?.invoice_no || item?.othergoods_invoice_details?.inward_sr_no || '';

        // Department
        row.getCell(4).value = item.department_name || '';

        // Machine
        row.getCell(5).value = item.machine_name || '';

        // Qty
        row.getCell(6).value = item.total_quantity || 0;

        // Unit
        row.getCell(7).value = item.unit || item.units || item.uom || '';

        // amount
        row.getCell(8).value = item.amount || 0;

        // Apply borders and alignment
        for (let i = 1; i <= 8; i++) {
            const cell = row.getCell(i);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            if (i === 1 || i === 3 || i === 6 || i === 8) {
                cell.alignment = { horizontal: 'right' };
            } else {
                cell.alignment = { horizontal: 'left' };
            }
        }

        totalAmount += item.amount || 0;
        currentRow++;
    });

    // Add Total Row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(7).value = 'Total';
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(7).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };

    totalRow.getCell(8).value = totalAmount;
    totalRow.getCell(8).font = { bold: true };
    totalRow.getCell(8).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
    totalRow.getCell(8).alignment = { horizontal: 'right' };

    // Generate file path
    const timestamp = new Date().getTime();
    const fileName = `store_daily_report_${timestamp}.xlsx`;
    const dirPath = 'public/reports/OtherGoods';
    const filePath = `${dirPath}/${fileName}`;

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Save the workbook
    await workbook.xlsx.writeFile(filePath);

    const downloadLink = `${process.env.APP_URL}${filePath}`;

    return downloadLink;
};

export { GenerateOtherGoodsDailyReport };
