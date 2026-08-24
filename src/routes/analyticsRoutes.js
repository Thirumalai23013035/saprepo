const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const MatchResult = require('../models/MatchResult');
const { getDashboard } = require('../services/analyticsService');

const router = express.Router();
router.get('/dashboard', asyncHandler(async (req, res) => res.json(await getDashboard())));
router.get('/exceptions', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const filter = { decision: { $in: ['REVIEW', 'BLOCK'] } };
  if (req.query.decision) filter.decision = req.query.decision;
  res.json(await MatchResult.find(filter).populate({ path: 'invoice', populate: [{ path: 'supplier' }, { path: 'purchaseOrder' }] }).sort({ riskScore: -1, matchedAt: 1 }).limit(limit));
}));

module.exports = router;
