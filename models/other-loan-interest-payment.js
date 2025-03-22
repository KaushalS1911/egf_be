const mongoose = require('mongoose');

const otherLoanInterestPaymentSchema = new mongoose.Schema({
    otherLoan: {type: String, ref: "Other Issued Loan", required: true},
    to: Date,
    from: Date,
    days: String,
    payDate: Date,
    amountPaid: Number,
    payAfterAdjust: Number,
    remark: String,
    paymentDetail: {type: Object, default: null}
}, {timestamps: true});

module.exports = mongoose.model('OtherLoanInterestPayment', otherLoanInterestPaymentSchema);