const mongoose = require('mongoose')

const schemeSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    name: String,
    interestRate: Number,
    interestPeriod: {type: String, default: null},
    schemeType: String,
    valuation: Number,
    renewalTime: String,
    minLoanTime: String,
    ratePerGram: Number,
    remark: String,
    status: {type: String, default: "Active"},
    deleted_at: {type: Date, default: null},
}, {timestamps: true})

module.exports = mongoose.model("Scheme", schemeSchema)