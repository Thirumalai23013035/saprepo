const mongoose = require('mongoose');

const discrepancySchema = new mongoose.Schema({
  type: { type: String, enum: ['MISSING_PO', 'MISSING_RECEIPT', 'SUPPLIER_MISMATCH', 'SKU_MISMATCH', 'QUANTITY_MISMATCH', 'PRICE_MISMATCH', 'CURRENCY_MISMATCH', 'TOTAL_MISMATCH'], required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  poLineNumber: Number,
  message: { type: String, required: true },
  expected: mongoose.Schema.Types.Mixed,
  actual: mongoose.Schema.Types.Mixed
}, { _id: false });

const matchResultSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, unique: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  receipts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceipt' }],
  decision: { type: String, enum: ['PASS', 'REVIEW', 'BLOCK'], required: true },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  discrepancies: [discrepancySchema],
  recommendations: [{ type: String }],
  matchedAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  resolvedBy: String
}, { timestamps: true });

matchResultSchema.index({ decision: 1, riskScore: -1, matchedAt: -1 });
module.exports = mongoose.model('MatchResult', matchResultSchema);
