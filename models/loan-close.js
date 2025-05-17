const mongoose = require('mongoose')

const loanCloseSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued Loan", required: true},
    date: {type: Date, required: true,default: Date.now().toString()},
    totalLoanAmount: Number,
    netAmount: Number,
    closingCharge: Number,
    remark: String,
    entryBy: String,
    paymentDetail: Object,
    deleted_at: {type: Date, default: null},
    chargePaymentDetail: Object,
},{timestamps: true})

module.exports = mongoose.model("Loan Close", loanCloseSchema)