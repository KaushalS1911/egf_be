const mongoose = require("mongoose")

const interestSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued loan", required: true},
    to: Date,
    from: Date,
    interestAmount: Number,
    consultingCharge: Number,
    penalty: {type: Number, default: 0},
    amountPaid: {type: Number, default: 0},
    cr_dr: {type: Number, default: 0},
    paymentDetail: {type: Object, default: null},
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Interest', interestSchema)





