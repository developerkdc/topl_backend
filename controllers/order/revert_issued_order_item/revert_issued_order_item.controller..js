import { isValidObjectId } from 'mongoose';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { StatusCodes } from '../../../utils/constants.js';
import mongoose from 'mongoose';
import issue_for_order_model from '../../../database/schema/order/issue_for_order/issue_for_order.schema.js';
import { log_inventory_invoice_model, log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { item_issued_from } from '../../../database/Utils/constants/constants.js';
import { flitch_inventory_invoice_model, flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { plywood_inventory_items_details } from '../../../database/schema/inventory/Plywood/plywood.schema.js';

class RevertOrderItem {
    constructor(id, userDetails, session) {
        if (!isValidObjectId(id)) {
            throw new ApiError('Invalid Order ID', StatusCodes.BAD_REQUEST);
        }
        this.id = id;
        this.userDetails = userDetails;
        this.session = session;
    }

    async fetch_order_data() {
        const issued_order_data = await issue_for_order_model.findById(this.id);
        if (!issued_order_data) {
            throw new ApiError('Issue for data not found', StatusCodes.BAD_REQUEST);
        }
        this.issued_order_data = issued_order_data;
        return issued_order_data;
    }

    async update_inventory_item_status() {
        try {
            await this.fetch_order_data();

            const issued_from = this.issued_order_data?.issued_from;

            if (!this[issued_from]) {
                throw new ApiError(
                    `Invalid issued from type : ${issued_from}`,
                    StatusCodes.BAD_REQUEST
                );
            }

            await this[issued_from]();
        } catch (error) {
            throw error;
        }
    }

    async LOG() {
        const update_log_item =
            await log_inventory_items_model?.findOneAndUpdate(
                { _id: this.issued_order_data?.item_details?._id },
                {
                    $set: {
                        issue_status: null,
                        updated_by: this?.userDetails?._id,
                    },
                },
                { new: true, session: this.session }
            );

        if (!update_log_item) {
            throw new ApiError('Log item not found', StatusCodes.BAD_REQUEST);
        }

        const is_invoice_editable = await log_inventory_items_model?.find({ _id: { $ne: update_log_item?._id }, invoice_id: update_log_item?.invoice_id, issue_status: { $ne: null } });

        if (is_invoice_editable && is_invoice_editable?.length === 0) {
            const update_log_item_invoice_editable_status = await log_inventory_invoice_model?.updateOne({ _id: update_log_item?._id }, {
                $set: {
                    isEditable: true,
                    updated_by: this.userDetails?._id
                }
            }, { session: this.session });

            if (
                !update_log_item_invoice_editable_status?.acknowledged ||
                update_log_item_invoice_editable_status?.modifiedCount === 0
            ) {
                throw new ApiError(
                    'Failed to Update Log Item Invoice status',
                    StatusCodes.BAD_REQUEST
                );
            };
        }



    }
    async FLITCH() {
        const update_flitch_item =
            await flitch_inventory_items_model?.updateOne(
                { _id: this.issued_order_data?.item_details?._id },
                {
                    $set: {
                        issue_status: null,
                        updated_by: this?.userDetails?._id,
                    },
                },
                { session: this.session }
            );

        if (update_flitch_item?.matchedCount === 0) {
            throw new ApiError('Flitch item not found', StatusCodes.BAD_REQUEST);
        }

        const is_invoice_editable = await flitch_inventory_items_model?.find({ _id: { $ne: update_flitch_item_invoice_editable_status?._id }, invoice_id: update_flitch_item?.invoice_id, issue_status: { $ne: null } });

        if (is_invoice_editable && is_invoice_editable?.length === 0) {
            const update_flitch_item_invoice_editable_status = await flitch_inventory_invoice_model?.updateOne({ _id: update_flitch_item?._id }, {
                $set: {
                    isEditable: true,
                    updated_by: this.userDetails?._id
                }
            }, { session: this.session });
            if (update_flitch_item_invoice_editable_status?.matchedCount === 0) {
                throw new ApiError('Flitch item Invoice not found', StatusCodes.BAD_REQUEST);
            }
            if (
                !update_flitch_item_invoice_editable_status?.acknowledged ||
                update_flitch_item_invoice_editable_status?.modifiedCount === 0
            ) {
                throw new ApiError(
                    'Failed to update Flitch Item Invoice Status',
                    StatusCodes.BAD_REQUEST
                );
            };
        }
    }
}

export default RevertOrderItem;
