const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/procurement_match',
  clientUrl: process.env.CLIENT_URL || '*',
  priceTolerancePercent: Number(process.env.PRICE_TOLERANCE_PERCENT || 2),
  quantityTolerancePercent: Number(process.env.QUANTITY_TOLERANCE_PERCENT || 0)
};
