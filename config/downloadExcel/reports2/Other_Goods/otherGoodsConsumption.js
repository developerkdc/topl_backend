import exceljs from 'exceljs';
import fs from 'fs/promises';
import ApiError from '../../../../utils/errors/apiError.js';

/**
 * Create Other Goods Consumption Report Excel
 */
export const createOtherGoodsConsumptionReportExcel = async (
    aggregatedData,
    startDate,
    endDate,
    filter = {},
    includeCostAndExpense
) => {
    try {
        const folderPath = 'public/upload/reports/reports2/Other_Goods';

        // Ensure folder exists
        try {
            await fs.access(folderPath);
        } catch (error) {
            await fs.mkdir(folderPath, { recursive: true });
            console.log('Folder created:', folderPath);
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Other Goods Consumption');

        // Format dates for title
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            try {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
            } catch (err) {
                return 'N/A';
            }
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        // Define columns
        const columnDefinitions = [
            { key: 'department', width: 20 }, // 1. Department
            { key: 'machine', width: 25 },    // 2. Machine
            { key: 'item', width: 30 },       // 3. Item
            { key: 'qty', width: 12 },        // 4. Qty
            { key: 'unit', width: 12 },       // 5. Unit
            ...(includeCostAndExpense ? [{ key: 'amt', width: 15 }] : []),
        ];
        worksheet.columns = columnDefinitions;

        const lastCol = includeCostAndExpense ? 6 : 5; // F if amt column exists, else E

        let currentRow = 1;
        // Row 1: Date Range title
        worksheet.mergeCells(currentRow, 1, currentRow, lastCol);
        const titleCell = worksheet.getCell(currentRow, 1);
        titleCell.value = `Store Consumption Report Date: ${formattedStartDate} to ${formattedEndDate}`;
        titleCell.font = { bold: true, size: 12 };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
        worksheet.getRow(currentRow).height = 20;
        currentRow++;

        // Row 2: Empty row for spacing
        worksheet.addRow([]);

        // Row 3: Headers
        const headerRow = worksheet.addRow([
            'Department',
            'Machine',
            'Item',
            'Qty',
            'Unit',
            ...(includeCostAndExpense ? ['Amt'] : []),
        ]);
        headerRow.font = { bold: true };

        // Add styling for header border
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Group data by department first so subtotals are correct even if
        // the input isn't pre-sorted (avoids duplicate "X Total" rows).
        const groupedData = [...aggregatedData].sort((a, b) => {
            const deptA = a.department_name || '';
            const deptB = b.department_name || '';
            return deptA.localeCompare(deptB);
        });

        const addSubTotalRow = (deptName, total) => {
            const subTotalRow = worksheet.addRow([
                ...(includeCostAndExpense ? [`${deptName} Total`] : ""), '', '', '', '',
                ...(includeCostAndExpense ? [total] : []),
            ]);
            subTotalRow.font = { bold: true };
            subTotalRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            worksheet.mergeCells(`A${subTotalRow.number}:E${subTotalRow.number}`);
        };

        // Loop to populate data
        let currentDept = null;
        let deptTotal = 0;
        let grandTotal = 0;

        groupedData.forEach((item) => {
            const thisDept = item.department_name || '';
            const thisMachine = item.machine_name || '';
            const thisItemName = item.item_name || '';
            const thisQty = item.total_quantity !== null && item.total_quantity !== undefined
                ? parseFloat(item.total_quantity)
                : null;
            const thisUnit = item.unit || '';
            const thisAmt = includeCostAndExpense
                ? (item.amount !== null && item.amount !== undefined ? parseFloat(item.amount) : null)
                : null;

            // If department changes, print the subtotal row for the previous department
            if (currentDept !== null && currentDept !== thisDept) {
                addSubTotalRow(currentDept, deptTotal);
                grandTotal += deptTotal;
                deptTotal = 0;
            }

            // Print the data row
            const deptToPrint = (currentDept !== thisDept) ? thisDept : '';

            const row = worksheet.addRow([
                deptToPrint,
                thisMachine,
                thisItemName,
                thisQty,
                thisUnit,
                ...(includeCostAndExpense ? [thisAmt] : []),
            ]);

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            if (includeCostAndExpense && typeof thisAmt === 'number' && !Number.isNaN(thisAmt)) {
                deptTotal += thisAmt;
            }
            currentDept = thisDept;
        });

        // Print final department subtotal
        if (currentDept !== null) {
            addSubTotalRow(currentDept, deptTotal);
            grandTotal += deptTotal;
        }

        // Print Grand total
        const grandTotalRow = worksheet.addRow([
            ...(includeCostAndExpense ? ['Grand Total'] : ['']), '', '', '', '', ...(includeCostAndExpense ? [grandTotal] : []),
        ]);
        grandTotalRow.font = { bold: true };
        grandTotalRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.mergeCells(`A${grandTotalRow.number}:E${grandTotalRow.number}`);

        // Save file
        const timeStamp = new Date().getTime();
        const fileName = `store_consumption_report_${timeStamp}.xlsx`;
        const filePath = `${folderPath}/${fileName}`;

        await workbook.xlsx.writeFile(filePath);

        const downloadLink = `${process.env.APP_URL}${filePath}`;
        console.log('Other goods consumption report generated => ', downloadLink);

        return downloadLink;
    } catch (error) {
        console.error('Error creating other goods consumption report:', error);
        throw new ApiError(500, error.message, error);
    }
};