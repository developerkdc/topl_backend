import exceljs from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import ApiError from '../../../../utils/errors/apiError.js';
import dotenv from 'dotenv/config';

/**
 * Other Goods Machine Wise Report Excel
 * Generates a styled report of other goods assigned to machines
 * 
 * @param {Array} data - List of objects { machine, item, qty, unit, amt }
 * @param {String} startDate - Start date string
 * @param {String} endDate - End date string
 * @param {Object} filter - Applied filters
 * @returns {String} Download link for the generated Excel file
 */
export const OtherGoodsMachineWiseReportExcel = async (data, startDate, endDate, filter = {}) => {
    try {
        const folderPath = 'public/reports/Other_Goods/MachineWiseReport';

        // Ensure folder exists
        try {
            await fs.access(folderPath);
        } catch (error) {
            await fs.mkdir(folderPath, { recursive: true });
            console.log('Folder created:', folderPath);
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Machine Wise Report');

        // Format dates for title
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            try {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            } catch (err) {
                return 'N/A';
            }
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        // Build title
        const title = `Machine Wise Details Between ${formattedStartDate} and ${formattedEndDate}`;

        // Define columns (without headers to avoid Row 1 auto-fill)
        const columnDefinitions = [
            { key: 'machine', width: 25 },
            { key: 'item', width: 25 },
            { key: 'qty', width: 12 },
            { key: 'unit', width: 12 },
            { key: 'amt', width: 15 }
        ];

        worksheet.columns = columnDefinitions;

        // Row 1: Title row
        const titleRow = worksheet.getRow(1);
        titleRow.values = [title];
        titleRow.font = { bold: true, size: 12 };
        titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
        titleRow.height = 25;
        worksheet.mergeCells(1, 1, 1, 5);

        // Row 2: Column headers
        const headerRow = worksheet.getRow(2);
        headerRow.values = ['Machine', 'Item', 'Qty', 'Unit', 'Amt'];
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' },
        };

        // Add borders to headers
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        let totalAmt = 0;

        // Add data rows
        data.forEach((item) => {
            const row = worksheet.addRow({
                machine: item.machine,
                item: item.item,
                qty: parseFloat(item.qty || 0).toFixed(2),
                unit: item.unit,
                amt: parseFloat(item.amt || 0).toFixed(2)
            });

            // Add borders and alignment to each cell
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Right align numbers
                if (colNumber === 3 || colNumber === 5) {
                    cell.alignment = { horizontal: 'right' };
                } else {
                    cell.alignment = { horizontal: 'left' };
                }
            });

            totalAmt += parseFloat(item.amt || 0);
        });

        // Add grand total row
        const totalRow = worksheet.addRow({
            machine: 'Grand Total',
            amt: totalAmt.toFixed(2)
        });

        // Style total row
        totalRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' },
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            if (colNumber === 5) {
                cell.alignment = { horizontal: 'right' };
            }
        });

        // Merge "Grand Total" across first 4 columns if possible, or just style first cell
        // In itemWiseInward, they just put 'Total' in the first cell

        // Save file
        const timestamp = new Date().getTime();
        const fileName = `Machine-Wise-Other-Goods-Report-${timestamp}.xlsx`;
        const filePath = `${folderPath}/${fileName}`;

        await workbook.xlsx.writeFile(filePath);

        // Ensure URL has proper slashes (path.join uses \ on Windows)
        const urlPath = folderPath.split(path.sep).join('/');
        const urlFile = fileName;

        // Generate download link (assumes process.env.APP_URL is defined)
        const baseUrl = process.env.APP_URL || '';
        const downloadLink = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${urlPath}/${urlFile}`;

        return downloadLink;
    } catch (error) {
        console.error('Error creating machine wise report:', error);
        throw new ApiError(error.message || 'Error creating machine wise report', 500);
    }
};
