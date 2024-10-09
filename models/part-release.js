const mongoose = require("mongoose")

const partReleaseSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued loan", required: true},
    propertyName: String,
    carat: String,
    propertyWt: Number,
    propertyNetWt: Number,
    netAmount: Number,
    grossAmount: Number,
    totalAmount: Number,
    remark: String,
    propertyImage: String,
    paymentDetail: Object,
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Part release', partReleaseSchema)





