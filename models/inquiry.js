const mongoose = require('mongoose')

const inquirySchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", required: true},
    assignTo: {type: String, ref: "Employee", required: true},
    status: {type: String, default: "Active"},
    firstName: String,
    lastName: String,
    inquiryFor: String,
    remark: String,
    address: String,
    attempts: [],
    date: Date,
    recallingDate: {type: Date, default: null},
    email: String,
    contact: String,
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Inquiry", inquirySchema)