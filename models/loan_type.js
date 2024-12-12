const mongoose = require('mongoose')

const loanSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    loanType: String,
    approvalCharge: Number,
    remark: String,
    isActive: {type: Boolean, default: true},
},{timestamps: true})

module.exports = mongoose.model("Loan", loanSchema)