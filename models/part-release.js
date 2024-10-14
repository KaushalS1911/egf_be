const mongoose = require("mongoose")

const partReleaseSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued Loan", required: true},
    property: [],
    remark: String,
    propertyImage: String,
    paymentDetail: Object,
    totalAmount: Number,
    amountPaid: Number,
    date: Date,
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Part release', partReleaseSchema)





