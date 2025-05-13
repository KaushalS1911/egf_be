const mongoose = require('mongoose');

const chargeInOutSchema = new mongoose.Schema({
    company: {type: String, ref: 'Company'},
    branch: {type: String, ref: 'Branch'},
    chargeType: String,
    description: String,
    category: String,
    date: Date,
    paymentDetails: Object
}, {timestamps: true});

module.exports = mongoose.model('ChargeInOut', chargeInOutSchema);