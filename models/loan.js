const mongoose = require('mongoose')

const loanSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    loanType: String,
    remark: String,
    isActive: {type: Boolean, default: true},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Loan", loanSchema)