const mongoose = require('mongoose')

const penaltySchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    penaltyCode: String,
    afterDueDateFromDate: Number,
    afterDueDateToDate: Number,
    penaltyInterest: Number,
    remark: String,
    isActive: {type: Boolean, default: true},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Penalty", penaltySchema)