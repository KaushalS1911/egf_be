const mongoose = require("mongoose")

const partReleaseSchema = new mongoose.Schema({
    loan: {type: String, ref: "Issued loan", required: true},
    date: Date,
    property_name: String,
    carat: String,
    property_wt: Number,
    property_net_wt: Number,
    net_amount: Number,
    gross_amount: Number,
    total_amount: Number,
    remark: String,
    property_image: String,
    paymentDetail: Object,
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Part release', partReleaseSchema)





