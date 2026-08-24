const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  taxId: { type: String, trim: true },
  currency: { type: String, default: 'USD', uppercase: true, minlength: 3, maxlength: 3 },
  paymentTermsDays: { type: Number, default: 30, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
