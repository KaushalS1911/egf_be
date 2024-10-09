const mongoose = require("mongoose")

const loanPartPaymentSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued loan", required: true},
    date: Date,
    amount: Number,
    remark: String,
    paymentDetail: Object,
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Part payment', loanPartPaymentSchema)





