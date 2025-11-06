import exceljs from 'exceljs';
import ApiError from '../../../../utils/errors/apiError.js';

export const create_decorative_order_approval_report = async (newData, req, res) => {
    try {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Decorative-Order-Approval-Logs');

        worksheet.columns = [
            { header: 'Sr. No', key: 'sr_no', width: 8 },
            { header: 'Order No', key: 'order_no', width: 14 },
            { header: 'Order Date', key: 'order_date', width: 15 },
            { header: 'Approval Status', key: 'approval_status', width: 18 },
            { header: 'Order Updated By', key: 'edited_by', width: 20 },
            { header: 'Approved By', key: 'approved_by', width: 20 },
            { header: 'Rejected By', key: 'rejected_by', width: 20 },
            { header: 'Owner Name', key: 'owner_name', width: 25 },
            { header: 'Order Type', key: 'order_type', width: 15 },
            { header: 'Credit Schedule', key: 'credit_schedule', width: 18 },

            // 🪵 Product / Item details
            { header: 'Product Category', key: 'product_category', width: 18 },
            { header: 'Item No', key: 'item_no', width: 10 },
            { header: 'Item Name', key: 'item_name', width: 25 },
            { header: 'Item Sub Category', key: 'item_sub_category_name', width: 20 },
            { header: 'Sales Item Name', key: 'sales_item_name', width: 30 },
            { header: 'Value Added Process', key: 'value_added_process', width: 25 },
            { header: 'Pressing Instructions', key: 'pressing_instructions', width: 20 },

            // 📸 Photo / Group / Series
            { header: 'Photo Number', key: 'photo_number', width: 15 },
            { header: 'Group Number', key: 'group_number', width: 15 },
            { header: 'Series Name', key: 'series_name', width: 15 },

            // 🪵 Base Details
            { header: 'Base Type', key: 'base_type', width: 15 },
            { header: 'Base Sub Category', key: 'base_sub_category_name', width: 20 },
            { header: 'Base Min Thickness', key: 'base_min_thickness', width: 18 },

            // 📏 Dimensions
            { header: 'Length', key: 'length', width: 10 },
            { header: 'Width', key: 'width', width: 10 },
            { header: 'Thickness', key: 'thickness', width: 12 },
            { header: 'No. of Sheets', key: 'no_of_sheets', width: 14 },
            { header: 'Dispatched Sheets', key: 'dispatch_no_of_sheets', width: 18 },
            { header: 'SQM', key: 'sqm', width: 12 },
            { header: 'Rate', key: 'rate', width: 10 },
            { header: 'Amount', key: 'amount', width: 14 },

            // 📝 Other details
            { header: 'Remarks', key: 'remark', width: 25 },
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

            let approvalStatus = 'Pending';
            if (order.approval_status?.approved?.status) approvalStatus = 'Approved';
            else if (order.approval_status?.rejected?.status) approvalStatus = 'Rejected';
            else if (order.approval_status?.sendForApproval?.status) approvalStatus = 'Sent For Approval';

            const valueAddedProcess = (item.value_added_process || [])
                .map(p => p.process_name)
                .join(', ');

            worksheet.addRow({
                sr_no: index + 1,
                order_no: order.order_no || '-',
                order_date: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-',
                approval_status: approvalStatus,
                edited_by: order.edited_user_details?.user_name || '-',
                approved_by: order.approved_user_details?.user_name || '-',
                rejected_by: order.rejected_user_details?.user_name || '-',
                owner_name: order.owner_name || '-',
                order_type: order.order_type || '-',
                credit_schedule: order.credit_schedule || '-',
                product_category: item.product_category || '-',
                item_no: item.item_no || '-',
                item_name: item.item_name || '-',
                item_sub_category_name: item.item_sub_category_name || '-',
                sales_item_name: item.sales_item_name || '-',
                value_added_process: valueAddedProcess || '-',
                pressing_instructions: item.pressing_instructions || '-',
                photo_number: item.photo_number || '-',
                group_number: item.group_number || '-',
                series_name: item.series_name || '-',
                base_type: item.base_type || '-',
                base_sub_category_name: item.base_sub_category_name || '-',
                base_min_thickness: item.base_min_thickness || '-',
                length: item.length || '-',
                width: item.width || '-',
                thickness: item.thickness || '-',
                no_of_sheets: item.no_of_sheets || '-',
                dispatch_no_of_sheets: item.dispatch_no_of_sheets || '-',
                sqm: item.sqm || '-',
                rate: item.rate || '-',
                amount: item.amount || '-',
                remark: item.remark || '-',
                created_by:
                    createdUser.user_name ||
                    `${createdUser.first_name || ''} ${createdUser.last_name || ''}`.trim(),
                updated_by:
                    updatedUser.user_name ||
                    `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
                createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-',
                updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'
            });
        });

        const fileName = `Decorative_Order_Approval_Logs_${Date.now()}.xlsx`;
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
