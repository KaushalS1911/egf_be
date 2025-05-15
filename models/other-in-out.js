const mongoose = require('mongoose');

const otherInOutSchema = new mongoose.Schema({
    company: {type: String, ref: 'Company'},
    branch: {type: String, ref: 'Branch'},
    otherIncomeType: String,
    description: String,
    category: String,
    date: Date,
    paymentDetails: Object,
    status: {type: String}
}, {timestamps: true});

module.exports = mongoose.model('OtherInOut', otherInOutSchema);