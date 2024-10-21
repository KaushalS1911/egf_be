const mongoose = require('mongoose')

const inquirySchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", required: true},
    assignTo: {type: String, ref: "Employee", required: true},
    response: {type: String, default: null},
    firstName: String,
    lastName: String,
    inquiryFor: String,
    remark: String,
    date: Date,
    email: String,
    contact: String,
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Inquiry", inquirySchema)