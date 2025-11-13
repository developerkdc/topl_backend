import exceljs from 'exceljs';

export const create_packing_done_approval_report = async (
    data,
    req,
    res,
    next
) => {
    try {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Approval Packing Done Report');

        worksheet.columns = [
            { header: 'Packing ID', key: 'packing_id', width: 14 },
            { header: 'Packing Date', key: 'packing_date', width: 18 },
            { header: 'Approval Status', key: 'approval_status', width: 18 },
            { header: 'Order Updated By', key: 'edited_by', width: 18 },
            { header: 'Approved By', key: 'approved_by', width: 20 },
            { header: 'Rejected By', key: 'rejected_by', width: 20 },
            { header: 'Customer Name', key: 'customer_name', width: 25 },
            { header: 'Order Category', key: 'order_category', width: 20 },
            { header: 'Product Type', key: 'product_type', width: 20 },
            { header: 'Sales Item Name', key: 'sales_item_name', width: 25 },
            { header: 'Photo No', key: 'photo_no', width: 18 },
            { header: 'Is Dispatch Done', key: 'is_dispatch_done', width: 15 },
            { header: 'Order Number', key: 'order_no', width: 25 },
            { header: 'Order Item Number', key: 'order_item_no', width: 25 },
            { header: 'Item Name', key: 'item_name', width: 20 },
            { header: 'Item Sub Category', key: 'item_sub_category_name', width: 20 },
            { header: 'Log No', key: 'log_no', width: 14 },
            { header: 'Group No', key: 'group_no', width: 14 },
            { header: 'Length', key: 'length', width: 10 },
            { header: 'New Length', key: 'new_length', width: 14 },
            { header: 'Width', key: 'width', width: 10 },
            { header: 'New Width', key: 'new_width', width: 14 },
            { header: 'Thickness', key: 'thickness', width: 12 },
            { header: 'No. of Sheets', key: 'no_of_sheets', width: 14 },
            { header: 'No. of Leaves', key: 'no_of_leaves', width: 14 },
            { header: 'SQM', key: 'sqm', width: 12 },
            { header: 'CBM', key: 'cbm', width: 12 },
            { header: 'Quantity', key: 'quantity', width: 12 },
            { header: 'Amount', key: 'amount', width: 14 },
            { header: 'Remark', key: 'remark', width: 25 },
            { header: 'Created By', key: 'created_by', width: 20 },
            { header: 'Updated By', key: 'updated_by', width: 20 },
            { header: 'Created Date', key: 'created_at', width: 18 },
            { header: 'Updated Date', key: 'updated_at', width: 18 },
        ];

        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });

        let rowCount = 1;

        for (const record of data) {
            const approvalStatus = record.approval_status?.approved?.status
                ? 'Approved'
                : record.approval_status?.rejected?.status
                    ? 'Rejected'
                    : record.approval_status?.sendForApproval?.status
                        ? 'Sent For Approval'
                        : 'Pending';

            const baseData = {
                packing_id: record.packing_id || '-',
                packing_date: record.packing_date
                    ? new Date(record.packing_date).toLocaleDateString()
                    : '-',
                customer_name: record.customer_details?.company_name || '-',
                order_category: Array.isArray(record.order_category)
                    ? record.order_category.join(', ')
                    : record.order_category || '-',
                product_type: Array.isArray(record.product_type)
                    ? record.product_type.join(', ')
                    : record.product_type || '-',
                sales_item_name: record.sales_item_name || '-',
                photo_no: record.photo_no || '-',
                approval_status: approvalStatus,
                is_editable: record.isEditable ? 'Yes' : 'No',
                is_dispatch_done: record.is_dispatch_done ? 'Yes' : 'No',
                remark: record.remark || '-',
                created_by: record.created_by?.user_name || '-',
                updated_by: record.updated_by?.user_name || '-',
                edited_by: record.edited_user_details?.user_name || '-',
                approved_by: record.approved_user_details?.user_name || '-',
                rejected_by: record.rejected_user_details?.user_name || '-',
                created_at: record.createdAt
                    ? new Date(record.createdAt).toLocaleDateString()
                    : '-',
                updated_at: record.updatedAt
                    ? new Date(record.updatedAt).toLocaleDateString()
                    : '-',
            };

            if (
                Array.isArray(record.packing_done_item_details) &&
                record.packing_done_item_details.length > 0
            ) {
                for (const item of record.packing_done_item_details) {
                    worksheet.addRow({
                        ...baseData,
                        order_no: item?.order_no,
                        order_item_no: item?.order_item_no,
                        item_name: item.item_name || '-',
                        item_sub_category_name: item.item_sub_category_name || '-',
                        log_no: item.log_no || '-',
                        group_no: item.group_no || '-',
                        length: item.length || '-',
                        new_length: item.new_length || '-',
                        width: item.width || '-',
                        new_width: item.new_width || '-',
                        thickness: item.thickness || '-',
                        girth: item.girth || '-',
                        no_of_sheets: item.no_of_sheets || '-',
                        no_of_leaves: item.no_of_leaves || '-',
                        no_of_rolls: item.no_of_rolls || '-',
                        sqm: item.sqm || '-',
                        cbm: item.cbm || '-',
                        cmt: item.cmt || '-',
                        quantity: item.quantity || '-',
                        amount: item.amount || '-',
                    });
                }
            } else {
                worksheet.addRow(baseData);
            }
        }
        const fileName = `Approval_Packing_Done_Report_${Date.now()}.xlsx`;
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel generation error:', error);
        if (!res.headersSent) {
            next(error);
        }
    }
};
