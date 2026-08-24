const Invoice = require('../models/Invoice');
const MatchResult = require('../models/MatchResult');

async function getDashboard() {
  const [status, decisions, risk, topDiscrepancies, valueAtRisk] = await Promise.all([
    Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$total' } } }, { $sort: { count: -1 } }]),
    MatchResult.aggregate([{ $group: { _id: '$decision', count: { $sum: 1 } } }]),
    MatchResult.aggregate([{ $group: { _id: null, averageRiskScore: { $avg: '$riskScore' }, averageConfidence: { $avg: '$confidence' } } }]),
    MatchResult.aggregate([{ $unwind: '$discrepancies' }, { $group: { _id: '$discrepancies.type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Invoice.aggregate([{ $lookup: { from: 'matchresults', localField: '_id', foreignField: 'invoice', as: 'match' } }, { $unwind: '$match' }, { $match: { 'match.decision': { $in: ['REVIEW', 'BLOCK'] } } }, { $group: { _id: null, invoiceCount: { $sum: 1 }, amount: { $sum: '$total' } } }])
  ]);
  return { status, decisions, risk: risk[1] || { averageRiskScore: 0, averageConfidence: 0 }, topDiscrepancies, valueAtRisk: valueAtRisk[0] || { invoiceCount: 0, amount: 0 } };
}

module.exports = { getDashboard };
