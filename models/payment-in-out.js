const mongoose = require('mongoose');

const paymentInOutSchema = new mongoose.Schema({
    company: { type: String, ref: 'Company', required: true },
    branch: { type: String, ref: 'Branch', required: true },
    party: { type: String, ref: 'Party', required: true },
    receiptNo: { type: String },
    invoice: {type: String,default: ''},
    date: { type: Date },
    description: { type: String },
    status: { type: String },
    paymentDetail: Object,
    deleted_at: {type: Date, default: null},
}, { timestamps: true });

module.exports = mongoose.model('PaymentInOut', paymentInOutSchema);
