import exceljs from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Generates an Excel report for Other Goods Item Summary
 * Columns: Item, Op (Qty, Val), Purchase (Qty, Val), Issue (Qty, Val), Sales (Qty, Val), Damage (Qty, Val), Closing (Qty, Val)
 */
export const OtherItemSummaryReportExcel = async (reportData, startDate, endDate) => {
    try {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Other Item Summary');

        // Format dates for the title
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        // --- ROW 1: TITLE ---
        const title = `Other Item Summary Report Between ${formattedStartDate} and ${formattedEndDate}`;
        const titleRow = worksheet.addRow([title]);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells(1, 1, 1, 7); // Item + 6 stages = 7 columns
        titleRow.height = 30;

        // --- ROW 2: HEADERS ---
        const headers = [
            'Item',
            'Opening',
            'Purchase',
            'Issue',
            'Sales',
            'Damage',
            'Closing'
        ];
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // --- DATA ROWS ---
        reportData.forEach(item => {
            const row = worksheet.addRow([
                item.item_name,
                item.opening_qty,
                item.purchase_qty,
                item.issue_qty,
                item.sales_qty,
                item.damage_qty,
                item.closing_qty
            ]);

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Column Widths
        worksheet.getColumn(1).width = 35; // Item name
        for (let i = 2; i <= 7; i++) {
            worksheet.getColumn(i).width = 15;
        }

        // --- FILE SAVING ---
        const urlPath = 'public/upload/reports/Other_Goods';
        const absoluteDir = path.join(process.cwd(), urlPath);
        await fs.mkdir(absoluteDir, { recursive: true });

        const fileName = `Other_Item_Summary_${Date.now()}.xlsx`;
        const filePath = path.join(absoluteDir, fileName);
        await workbook.xlsx.writeFile(filePath);

        const baseUrl = process.env.APP_URL || '';
        const downloadLink = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${urlPath}/${fileName}`;

        return downloadLink;

    } catch (error) {
        console.error('Excel Generation Error:', error);
        throw new ApiError(500, `Failed to generate Item Summary Excel: ${error.message}`);
    }
};
