import exceljs from 'exceljs';
import ApiError from '../../../../utils/errors/apiError.js';

export const create_raw_order_approval_report = async (newData, req, res) => {
    console.log("new data => ", newData)
    try {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Raw-Order-Approval-Logs');

        worksheet.columns = [
            { header: 'Sr. No', key: 'sr_no', width: 8 },
            { header: 'Order No', key: 'order_no', width: 14 },
            { header: 'Order Date', key: 'order_date', width: 15 },
            { header: 'Approval Status', key: 'approval_status', width: 18 },
            { header: 'Order Updated By', key: 'edited_by', width: 18 },
            { header: 'Approved By', key: 'approved_by', width: 20 },
            { header: 'Rejected By', key: 'rejected_by', width: 20 },
            { header: 'Owner Name', key: 'owner_name', width: 25 },
            { header: 'Order Type', key: 'order_type', width: 15 },
            { header: 'Credit Schedule', key: 'credit_schedule', width: 18 },
            { header: 'Product Category', key: 'product_category', width: 20 },
            { header: 'Raw Material', key: 'raw_material', width: 20 },
            { header: 'Item No', key: 'item_no', width: 12 },
            { header: 'Item Name', key: 'item_name', width: 25 },
            { header: 'Item Sub Category', key: 'item_sub_category_name', width: 20 },
            { header: 'Log No', key: 'log_no', width: 15 },
            { header: 'Length', key: 'length', width: 10 },
            { header: 'Width', key: 'width', width: 10 },
            { header: 'Thickness', key: 'thickness', width: 12 },
            { header: 'CBM', key: 'cbm', width: 10 },
            { header: 'SQM', key: 'sqm', width: 12 },
            { header: 'Quantity', key: 'quantity', width: 12 },
            { header: 'Rate', key: 'rate', width: 12 },
            { header: 'Amount', key: 'amount', width: 14 },
            { header: 'Remarks', key: 'item_remarks', width: 25 },

            { header: 'Created By', key: 'created_by', width: 20 },
            { header: 'Updated By', key: 'updated_by', width: 20 },
            { header: 'Created At', key: 'createdAt', width: 18 },
            { header: 'Updated At', key: 'updatedAt', width: 18 }
        ];

        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
        });

        Object.values(newData).forEach((item, index) => {
            const order = item.order_details || {};
            const createdUser = item.created_user_details || {};
            const updatedUser = item.updated_user_details || {};

            // Derive readable approval status
            let approvalStatus = 'Pending';
            if (order.approval_status?.approved?.status) approvalStatus = 'Approved';
            else if (order.approval_status?.rejected?.status) approvalStatus = 'Rejected';
            else if (order.approval_status?.sendForApproval?.status) approvalStatus = 'Sent For Approval';

            worksheet.addRow({
                sr_no: index + 1,
                order_no: order.order_no || '-',
                order_date: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-',
                owner_name: order.owner_name || '-',
                order_type: order.order_type || '-',
                credit_schedule: order.credit_schedule || '-',
                product_category: order.product_category || '-',
                raw_material: item.raw_material || '-',
                item_no: item.item_no || '-',
                item_name: item.item_name || '-',
                item_sub_category_name: item.item_sub_category_name || '-',
                log_no: item.log_no || '-',
                length: item.length || '-',
                width: item.width || '-',
                thickness: item.thickness || '-',
                cbm: item.cbm || '-',
                sqm: item.sqm || '-',
                quantity: item.quantity || '-',
                rate: item.rate || '-',
                amount: item.amount || '-',
                item_remarks: item.item_remarks || '-',
                approval_status: approvalStatus,
                edited_by: order.edited_user_details?.user_name || '-',
                approved_by: order.approved_user_details?.user_name || '-',
                rejected_by: order.rejected_user_details?.user_name || '-',
                created_by:
                    createdUser.user_name ||
                    `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim(),
                updated_by:
                    updatedUser.user_name ||
                    `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
                createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-',
                updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
            });
        });

        const fileName = `Raw_Order_Approval_Logs_${Date.now()}.xlsx`;
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
