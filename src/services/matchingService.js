const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const MatchResult = require('../models/MatchResult');
const { priceTolerancePercent, quantityTolerancePercent } = require('../config/env');
const httpError = require('../utils/httpError');

const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const percentDifference = (actual, expected) => expected === 0 ? (actual === 0 ? 0 : 100) : Math.abs((actual - expected) / expected) * 100;

async function matchInvoice(invoiceId) {
  const invoice = await Invoice.findById(invoiceId).populate('supplier').populate('purchaseOrder');
  if (!invoice) throw httpError(404, 'Invoice not found');

  const discrepancies = [];
  const recommendations = [];
  const purchaseOrder = invoice.purchaseOrder;
  let receipts = [];

  if (!purchaseOrder) {
    discrepancies.push({ type: 'MISSING_PO', severity: 'CRITICAL', message: 'Invoice has no purchase order reference.' });
  } else {
    receipts = await GoodsReceipt.find({ purchaseOrder: purchaseOrder._id, status: 'POSTED' });
    if (String(invoice.supplier._id) !== String(purchaseOrder.supplier)) {
      discrepancies.push({ type: 'SUPPLIER_MISMATCH', severity: 'CRITICAL', message: 'Invoice supplier does not match the purchase order supplier.' });
    }
    if (invoice.currency !== purchaseOrder.currency) {
      discrepancies.push({ type: 'CURRENCY_MISMATCH', severity: 'HIGH', message: 'Invoice currency differs from the purchase order currency.', expected: purchaseOrder.currency, actual: invoice.currency });
    }
    if (!receipts.length) {
      discrepancies.push({ type: 'MISSING_RECEIPT', severity: 'HIGH', message: 'No posted goods receipt exists for this purchase order.' });
      recommendations.push('Confirm delivery with the receiving team and post the goods receipt before approval.');
    }

    const poByLine = new Map(purchaseOrder.lines.map(line => [line.lineNumber, line]));
    const receivedByLine = new Map();
    for (const receipt of receipts) {
      for (const line of receipt.lines) receivedByLine.set(line.poLineNumber, (receivedByLine.get(line.poLineNumber) || 0) + line.receivedQuantity);
    }

    for (const invoiceLine of invoice.lines) {
      const poLine = poByLine.get(invoiceLine.poLineNumber);
      if (!poLine) {
        discrepancies.push({ type: 'SKU_MISMATCH', severity: 'CRITICAL', poLineNumber: invoiceLine.poLineNumber, message: `Invoice line ${invoiceLine.poLineNumber} is not present on the purchase order.`, actual: invoiceLine.sku });
        continue;
      }
      if (poLine.sku !== invoiceLine.sku) {
        discrepancies.push({ type: 'SKU_MISMATCH', severity: 'HIGH', poLineNumber: invoiceLine.poLineNumber, message: `SKU mismatch on PO line ${invoiceLine.poLineNumber}.`, expected: poLine.sku, actual: invoiceLine.sku });
      }
      if (percentDifference(invoiceLine.invoicedQuantity, poLine.orderedQuantity) > quantityTolerancePercent) {
        discrepancies.push({ type: 'QUANTITY_MISMATCH', severity: 'HIGH', poLineNumber: invoiceLine.poLineNumber, message: `Invoiced quantity exceeds or differs from ordered quantity on line ${invoiceLine.poLineNumber}.`, expected: poLine.orderedQuantity, actual: invoiceLine.invoicedQuantity });
        recommendations.push(`Review quantity billed for PO line ${invoiceLine.poLineNumber}.`);
      }
      const receivedQuantity = receivedByLine.get(invoiceLine.poLineNumber) || 0;
      if (invoiceLine.invoicedQuantity > receivedQuantity + (receivedQuantity * quantityTolerancePercent / 100)) {
        discrepancies.push({ type: 'QUANTITY_MISMATCH', severity: 'CRITICAL', poLineNumber: invoiceLine.poLineNumber, message: `Invoiced quantity exceeds received quantity on line ${invoiceLine.poLineNumber}.`, expected: receivedQuantity, actual: invoiceLine.invoicedQuantity });
        recommendations.push(`Hold payment until receipt quantity covers PO line ${invoiceLine.poLineNumber}.`);
      }
      if (percentDifference(invoiceLine.unitPrice, poLine.unitPrice) > priceTolerancePercent) {
        discrepancies.push({ type: 'PRICE_MISMATCH', severity: 'HIGH', poLineNumber: invoiceLine.poLineNumber, message: `Unit price differs beyond tolerance on line ${invoiceLine.poLineNumber}.`, expected: poLine.unitPrice, actual: invoiceLine.unitPrice });
        recommendations.push(`Request a price correction or approved variance for PO line ${invoiceLine.poLineNumber}.`);
      }
    }
  }

  const calculatedSubtotal = invoice.lines.reduce((sum, line) => sum + line.invoicedQuantity * line.unitPrice, 0);
  if (Math.abs(round(calculatedSubtotal) - round(invoice.subtotal)) > 0.01) {
    discrepancies.push({ type: 'TOTAL_MISMATCH', severity: 'HIGH', message: 'Invoice subtotal does not equal the sum of its lines.', expected: round(calculatedSubtotal), actual: invoice.subtotal });
    recommendations.push('Ask the supplier to correct the invoice subtotal.');
  }
  const calculatedTotal = calculatedSubtotal + invoice.taxTotal;
  if (Math.abs(round(calculatedTotal) - round(invoice.total)) > 0.01) {
    discrepancies.push({ type: 'TOTAL_MISMATCH', severity: 'HIGH', message: 'Invoice total does not equal subtotal plus tax.', expected: round(calculatedTotal), actual: invoice.total });
  }

  const weights = { LOW: 5, MEDIUM: 15, HIGH: 30, CRITICAL: 50 };
  const riskScore = Math.min(100, discrepancies.reduce((score, item) => score + weights[item.severity], 0));
  const decision = riskScore === 0 ? 'PASS' : riskScore >= 50 ? 'BLOCK' : 'REVIEW';
  const confidence = round(Math.max(0, 1 - (discrepancies.length / Math.max(invoice.lines.length * 3, 1))));
  if (decision === 'PASS') recommendations.push('Three-way match passed. Invoice can proceed to approval.');
  else if (decision === 'BLOCK') recommendations.push('Do not release payment until all critical discrepancies are resolved.');
  else recommendations.push('Route invoice to AP exception review before approval.');

  const result = await MatchResult.findOneAndUpdate(
    { invoice: invoice._id },
    { invoice: invoice._id, purchaseOrder: purchaseOrder?._id, receipts: receipts.map(receipt => receipt._id), decision, riskScore, confidence, discrepancies, recommendations, matchedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  invoice.status = decision === 'PASS' ? 'MATCHED' : 'MISMATCHED';
  await invoice.save();
  return result;
}

module.exports = { matchInvoice };
