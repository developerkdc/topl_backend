import exceljs from 'exceljs';

export const create_dispatch_approval_report = async (data, req, res, next) => {
    console.log("Data => ", data)
    try {
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Dispatch Approval Report');

        worksheet.columns = [
            // { header: 'Dispatch ID', key: 'approval_dispatch_id', width: 20 },
            { header: 'Invoice No', key: 'invoice_no', width: 20 },
            { header: 'Invoice Date', key: 'invoice_date_time', width: 20 },
            { header: 'Removal of Goods Date', key: 'removal_of_good_date_time', width: 25 },
            { header: 'Transport Doc No', key: 'trans_doc_no', width: 20 },
            { header: 'Transport Doc Date', key: 'trans_doc_date', width: 20 },

            { header: 'Customer Name', key: 'customer_name', width: 25 },
            { header: 'Customer GST', key: 'customer_gst', width: 20 },
            { header: 'Supplier Type', key: 'supp_type', width: 14 },
            { header: 'Transaction Type', key: 'transaction_type', width: 18 },

            { header: 'Transporter Name', key: 'transporter_name', width: 20 },
            { header: 'Transport Mode', key: 'transport_mode', width: 20 },

            { header: 'Vehicle No', key: 'vehicle_number', width: 20 },
            { header: 'Driver Name', key: 'driver_name', width: 20 },
            { header: 'Driver Licence No', key: 'driver_licence_number', width: 20 },

            { header: 'Total Sheets', key: 'total_no_of_sheets', width: 15 },
            { header: 'Total SQM', key: 'total_sqm', width: 12 },
            { header: 'Final Amount', key: 'final_total_amount', width: 18 },

            { header: 'Approval Status', key: 'approval_status', width: 18 },
            { header: 'Sent For Approval By', key: 'edited_by', width: 18 },
            { header: 'Approved By', key: 'approved_by', width: 20 },
            { header: 'Rejected By', key: 'rejected_by', width: 20 },

            // dispatch items details
            { header: 'Order No', key: 'order_no', width: 14 },
            { header: 'Order Item No', key: 'order_item_no', width: 18 },
            { header: 'Item Name', key: 'item_name', width: 20 },
            { header: 'Sub Category', key: 'item_sub_category_name', width: 20 },
            { header: 'Log No', key: 'log_no', width: 14 },
            { header: 'Group No', key: 'group_no', width: 14 },
            { header: 'Length', key: 'length', width: 10 },
            { header: 'Width', key: 'width', width: 10 },
            { header: 'Thickness', key: 'thickness', width: 12 },
            { header: 'Sheets', key: 'no_of_sheets', width: 12 },
            { header: 'Leaves', key: 'no_of_leaves', width: 12 },
            { header: 'SQM', key: 'sqm', width: 10 },
            { header: 'CBM', key: 'cbm', width: 10 },
            { header: 'CMT', key: 'cmt', width: 10 },
            { header: 'Qty', key: 'quantity', width: 12 },
            { header: 'Amount', key: 'amount', width: 14 }
        ];

        // Bold header
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });


        for (const record of data) {
            const approvalStatus = record.approval_status?.approved?.status
                ? 'Approved'
                : record.approval_status?.rejected?.status
                    ? 'Rejected'
                    : record.approval_status?.sendForApproval?.status
                        ? 'Sent For Approval'
                        : 'Pending';

            const baseData = {
                // approval_dispatch_id: record.approval_dispatch_id || '-',
                invoice_no: record.invoice_no || '-',
                invoice_date_time: record.invoice_date_time
                    ? new Date(record.invoice_date_time).toLocaleDateString()
                    : '-',
                removal_of_good_date_time: record.removal_of_good_date_time
                    ? new Date(record.removal_of_good_date_time).toLocaleDateString()
                    : '-',

                trans_doc_no: record.trans_doc_no || '-',
                trans_doc_date: record.trans_doc_date
                    ? new Date(record.trans_doc_date).toLocaleDateString()
                    : '-',

                customer_name: record.customer_details?.owner_name || '-',
                customer_gst: record.customer_details?.gst_number || '-',
                supp_type: record.supp_type || '-',
                transaction_type: record.transaction_type || '-',

                transporter_name: record.transporter_details?._name || '-',
                transport_mode: record.transport_mode?.value || '-',

                vehicle_number: record.vehicle_number || '-',
                driver_name: record.driver_name || '-',
                driver_licence_number: record.driver_licence_number || '-',

                total_no_of_sheets: record.total_no_of_sheets || '-',
                total_sqm: record.total_sqm || '-',
                final_total_amount: record.final_total_amount || '-',

                approval_status: approvalStatus,
                edited_by: record.edited_by?.user_name || '-',
                approved_by: record.approved_by?.user_name || '-',
                rejected_by: record.rejected_by?.user_name || '-'
            };

            if (Array.isArray(record.dispatch_items) && record.dispatch_items.length > 0) {
                for (const item of record.dispatch_items) {
                    worksheet.addRow({
                        ...baseData,
                        order_no: item.order_no || '-',
                        order_item_no: item.order_item_no || '-',
                        item_name: item.item_name || '-',
                        item_sub_category_name: item.item_sub_category_name || '-',
                        log_no: item.log_no || '-',
                        group_no: item.group_no || '-',
                        length: item.length || '-',
                        width: item.width || '-',
                        thickness: item.thickness || '-',
                        no_of_sheets: item.no_of_sheets || '-',
                        no_of_leaves: item.no_of_leaves || '-',
                        sqm: item.sqm || '-',
                        cbm: item.cbm || '-',
                        cmt: item.cmt || '-',
                        quantity: item.quantity || '-',
                        amount: item.amount || '-'
                    });
                }
            } else {
                worksheet.addRow(baseData);
            }
        }

        const fileName = `Dispatch_Approval_Report_${Date.now()}.xlsx`;
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel generation error:', error);
        if (!res.headersSent) next(error);
    }
};
