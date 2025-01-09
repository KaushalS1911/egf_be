const mongoose = require('mongoose')

const otherLoanCloseSchema = new mongoose.Schema({
    otherLoan: {type: String, ref: "Other Issued Loan", required: true},
    totalLoanAmount: Number,
    paidLoanAmount: Number,
    remark: String,
    paymentDetail: Object,
})

module.exports = mongoose.model('OtherLoanClose', otherLoanCloseSchema)