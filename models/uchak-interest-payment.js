
const mongoose = require("mongoose")

const uchakInterestSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued Loan", required: true},
    date: Date,
    entryBy: String,
    amountPaid: {type: Number, default: 0},
    remark: {type: String},
    paymentDetail: {type: Object, default: null},
}, {timestamps: true})

module.exports = mongoose.model('Uchak interest', uchakInterestSchema)





