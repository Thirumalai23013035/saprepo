const express = require('express');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const Invoice = require('../models/Invoice');
const MatchResult = require('../models/MatchResult');
const validate = require('../middleware/validate');
const schemas = require('../validation/schemas');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { matchInvoice } = require('../services/matchingService');

const router = express.Router();
const create = (Model, schema) => [validate(schema), asyncHandler(async (req, res) => res.status(201).json(await Model.create(req.body)))];
const getById = Model => asyncHandler(async (req, res) => {
  const record = await Model.findById(req.params.id);
  if (!record) throw httpError(404, 'Record not found');
  res.json(record);
});

router.post('/suppliers', ...create(Supplier, schemas.supplier));
router.get('/suppliers', asyncHandler(async (req, res) => res.json(await Supplier.find().sort({ name: 1 }))));
router.get('/suppliers/:id', getById(Supplier));

router.post('/purchase-orders', ...create(PurchaseOrder, schemas.purchaseOrder));
router.get('/purchase-orders', asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await PurchaseOrder.find(filter).populate('supplier').sort({ issueDate: -1 }));
}));
router.get('/purchase-orders/:id', asyncHandler(async (req, res) => {
  const record = await PurchaseOrder.findById(req.params.id).populate('supplier');
  if (!record) throw httpError(404, 'Purchase order not found');
  res.json(record);
}));

router.post('/goods-receipts', ...create(GoodsReceipt, schemas.goodsReceipt));
router.get('/goods-receipts', asyncHandler(async (req, res) => {
  const filter = req.query.purchaseOrder ? { purchaseOrder: req.query.purchaseOrder } : {};
  res.json(await GoodsReceipt.find(filter).sort({ createdAt: -1 }));
}));
router.get('/goods-receipts/:id', getById(GoodsReceipt));

router.post('/invoices', ...create(Invoice, schemas.invoice));
router.get('/invoices', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  const invoices = await Invoice.find(filter).populate('supplier purchaseOrder').sort({ createdAt: -1 });
  res.json(invoices);
}));
router.get('/invoices/:id', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('supplier purchaseOrder');
  if (!invoice) throw httpError(404, 'Invoice not found');
  const match = await MatchResult.findOne({ invoice: invoice._id });
  res.json({ invoice, match });
}));
router.post('/invoices/:id/match', asyncHandler(async (req, res) => res.json(await matchInvoice(req.params.id))));
router.post('/invoices/:id/approve', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw httpError(404, 'Invoice not found');
  const match = await MatchResult.findOne({ invoice: invoice._id });
  if (!match || match.decision !== 'PASS') throw httpError(409, 'Only invoices with a PASS match can be approved');
  invoice.status = 'APPROVED';
  await invoice.save();
  res.json(invoice);
}));
router.patch('/invoices/:id/resolve', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw httpError(404, 'Invoice not found');
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
  if (!note) throw httpError(400, 'A resolution note is required');
  invoice.status = 'APPROVED';
  invoice.reviewNote = note;
  await invoice.save();
  const match = await MatchResult.findOneAndUpdate({ invoice: invoice._id }, { resolvedAt: new Date(), resolvedBy: req.body.resolvedBy || 'AP_REVIEWER' }, { new: true });
  res.json({ invoice, match });
}));

module.exports = router;
