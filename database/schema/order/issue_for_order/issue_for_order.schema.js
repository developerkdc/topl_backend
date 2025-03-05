import mongoose from "mongoose";

const issue_for_order_schema = new mongoose.Schema({});

const issue_for_order_model = mongoose?.models.issue_for_order_model || mongoose.model('issue_for_order_model', issue_for_order_schema, 'issue_for_order_model');

export default issue_for_order_model