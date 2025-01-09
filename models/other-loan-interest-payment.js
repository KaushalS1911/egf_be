const mongoose = require('mongoose');

const otherLoanInterestPaymentSchema = new mongoose.Schema({
    otherLoan: {type: String, ref: "Other Issued Loan", required: true},
    to: Date,
    from: Date,
    days: String,
    amountPaid: Number,
    remark: String,
    paymentDetail: {type: Object, default: null}
})

module.exports = mongoose.model('OtherLoanInterestPayment', otherLoanInterestPaymentSchema);