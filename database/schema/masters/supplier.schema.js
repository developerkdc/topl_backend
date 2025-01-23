import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  sr_no: Number,
  supplier_name: {
    type: String,
    required: [true, 'Supplier Name is required.'],
    unique: [true, 'Supplier Name already exist.'],
    uppercase: true,
    trim: true,
  },
  supplier_type: {
    type: [String],
    required: [true, 'Supplier Name is required.'],
    trim: true,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
});

const SupplierModel = mongoose.model('supplier', SupplierSchema);
// LogSchemaFunction("supplier", SupplierModel, []);

export default SupplierModel;
