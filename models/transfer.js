const mongoose = require('mongoose')

const transfer = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    brand: {type: String, ref: "Brand", required: true},
    transferType: String,
    transferDate: {type: Date, default: Date.now()},
    desc: String,
    paymentDetails: Object,
    status: String,
    deleted_at: {type: Date, default: null},
}, {timestamps: true})

module.exports = mongoose.model("Transfer", transfer)