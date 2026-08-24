const fs = require('node:fs/promises');
const path = require('node:path');
const { connectDatabase } = require('../src/config/database');
const Supplier = require('../src/models/Supplier');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const GoodsReceipt = require('../src/models/GoodsReceipt');
const Invoice = require('../src/models/Invoice');
const { matchInvoice } = require('../src/services/matchingService');

const dataDirectory = path.join(__dirname, '..', 'data');

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(dataDirectory, fileName), 'utf8'));
}

async function upsert(Model, filter, document) {
  return Model.findOneAndUpdate(filter, document, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true });
}

async function seed() {
  await connectDatabase();
  const supplierIds = new Map();
  for (const supplier of await readJson('suppliers.json')) {
    const record = await upsert(Supplier, { supplierCode: supplier.supplierCode }, supplier);
    supplierIds.set(supplier.supplierCode, record._id);
  }

  const poIds = new Map();
  for (const purchaseOrder of await readJson('purchase-orders.json')) {
    const record = await upsert(PurchaseOrder, { poNumber: purchaseOrder.poNumber }, { ...purchaseOrder, supplier: supplierIds.get(purchaseOrder.supplierCode) });
    poIds.set(purchaseOrder.poNumber, record._id);
  }

  for (const receipt of await readJson('goods-receipts.json')) {
    await upsert(GoodsReceipt, { receiptNumber: receipt.receiptNumber }, { ...receipt, purchaseOrder: poIds.get(receipt.poNumber) });
  }

  const invoiceIds = [];
  for (const invoice of await readJson('invoices.json')) {
    const record = await upsert(Invoice, { invoiceNumber: invoice.invoiceNumber }, { ...invoice, supplier: supplierIds.get(invoice.supplierCode), purchaseOrder: poIds.get(invoice.poNumber) });
    invoiceIds.push(record._id);
  }

  for (const invoiceId of invoiceIds) await matchInvoice(invoiceId);
  console.log(`Seeded ${supplierIds.size} suppliers, ${poIds.size} purchase orders, ${invoiceIds.length} invoices, and generated match results.`);
  await require('mongoose').connection.close();
}

seed().catch(async error => {
  console.error('Seed failed:', error.message);
  try { await require('mongoose').connection.close(); } catch {}
  process.exitCode = 1;
});
