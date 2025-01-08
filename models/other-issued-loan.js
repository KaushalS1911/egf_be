const mongoose = require('mongoose')

const otherIssuedLoanSchema = new mongoose.Schema({
    company: {type: String, ref: 'Company', required: true},
    loan: {type: String, ref: "Issued Loan", required: true},
    otherNumber: {type: String},
    otherName: {type: String},
    amount: {type: Number},
    percentage: {type: Number},
    rate: {type: Number},
    quantity: Number,
    date: {type: Date},
    grossWt: {type: Number},
    netWt: {type: Number},
    month: {type: String},
    renewalDate: {type: Date},
    closeDate: {type: Date},
    otherCharge: {type: Number},
    closingAmount: {type: Number},
    interestAmount: {type: Number},
    remarks: {type: String},
    isActive: {type: Boolean, default: true},
    deleted_at: {type: Date, default: null},
})

module.exports = mongoose.model('Other Issued Loan', otherIssuedLoanSchema);