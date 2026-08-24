const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema({
  poLineNumber: { type: Number, required: true, min: 1 },
  sku: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  invoicedQuantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  lines: { type: [invoiceLineSchema], required: true, validate: value => value.length > 0 },
  subtotal: { type: Number, required: true, min: 0 },
  taxTotal: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['RECEIVED', 'MATCHED', 'MISMATCHED', 'APPROVED', 'REJECTED', 'PAID'], default: 'RECEIVED' },
  reviewNote: { type: String, trim: true }
}, { timestamps: true });

invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ supplier: 1, invoiceDate: -1 });
module.exports = mongoose.model('Invoice', invoiceSchema);
