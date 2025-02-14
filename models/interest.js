const mongoose = require("mongoose")

const interestSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued Loan", required: true},
    to: Date,
    from: Date,
    adjustedPay: Number,
    days: String,
    interestAmount: Number,
    consultingCharge: Number,
    totalAmount: Number,
    interestLoanAmount: Number,
    uchakInterestAmount: Number,
    penalty: {type: Number, default: 0},
    amountPaid: {type: Number, default: 0},
    cr_dr: {type: Number, default: 0},
    paymentDetail: {type: Object, default: null},
    isUpdated: {type: Boolean}
}, {timestamps: true})

module.exports = mongoose.model('Interest', interestSchema)





