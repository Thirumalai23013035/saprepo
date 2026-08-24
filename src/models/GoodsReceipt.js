const mongoose = require('mongoose');

const receiptLineSchema = new mongoose.Schema({
  poLineNumber: { type: Number, required: true, min: 1 },
  sku: { type: String, required: true, trim: true },
  receivedQuantity: { type: Number, required: true, min: 0 },
  receivedDate: { type: Date, required: true }
}, { _id: false });

const goodsReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  receivedBy: { type: String, trim: true },
  lines: { type: [receiptLineSchema], required: true, validate: value => value.length > 0 },
  status: { type: String, enum: ['POSTED', 'REVERSED'], default: 'POSTED' }
}, { timestamps: true });

goodsReceiptSchema.index({ purchaseOrder: 1 });
module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema);
