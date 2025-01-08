const mongoose = require('mongoose')

const inquirySchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", required: true},
    assignTo: {type: String, ref: "Employee", required: true},
    status: {type: String, default: "Active"},
    firstName: {type: String, required: false},
    lastName: {type: String, required: false},
    inquiryFor: {type: String, required: false},
    remark: {type: String, required: false},
    address: {type: String, required: false},
    attempts: [],
    date: {type: Date, required: false, default: null},
    recallingDate: {type: Date, default: null},
    email: {type: String, required: false},
    contact: {type: String, required: false},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Inquiry", inquirySchema)