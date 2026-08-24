const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
    path: path.resolve(__dirname, '../../.env')
});

module.exports = {
    port: Number(process.env.PORT || 4000),
    mongoUri: process.env.MONGODB_URI,
    clientUrl: process.env.CLIENT_URL || '*',
    priceTolerancePercent: Number(process.env.PRICE_TOLERANCE_PERCENT || 2),
    quantityTolerancePercent: Number(process.env.QUANTITY_TOLERANCE_PERCENT || 0)
};