const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  lineNumber: { type: Number, required: true, min: 1 },
  sku: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  orderedQuantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: true });

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  issueDate: { type: Date, required: true },
  lines: { type: [lineSchema], required: true, validate: value => value.length > 0 },
  status: { type: String, enum: ['OPEN', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'], default: 'OPEN' }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
