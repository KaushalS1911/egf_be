const mongoose = require("mongoose")

const loanPartPaymentSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued Loan", required: true},
    amountPaid: Number,
    interestLoanAmount: Number,
    date: Date,
    entryBy: String,
    remark: String,
    paymentDetail: Object,
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Part payment', loanPartPaymentSchema)





