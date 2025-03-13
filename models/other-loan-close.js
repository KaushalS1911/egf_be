const mongoose = require('mongoose')

const otherLoanCloseSchema = new mongoose.Schema({
    otherLoan: {type: String, ref: "Other Issued Loan", required: true},
    totalLoanAmount: Number,
    paidLoanAmount: Number,
    payDate: Date,
    remark: String,
    paymentDetail: Object,
    closingCharge: Number
}, {timestamps: true});

module.exports = mongoose.model('OtherLoanClose', otherLoanCloseSchema)