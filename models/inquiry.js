const mongoose = require('mongoose')

const inquirySchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", required: true},
    assignTo: {type: String, ref: "Employee", required: true},
    status: {type: String, default: "Active"},
    firstName: {type: String, required: false, default: null},
    lastName: {type: String, required: false, default: null},
    inquiryFor: {type: String, required: false, default: null},
    remark: {type: String, required: false, default: null},
    address: {type: String, required: false, default: null},
    attempts: [],
    date: {type: Date, required: false, default: null},
    recallingDate: {type: Date, default: null},
    email: {type: String, required: false,default: null},
    contact: {type: String, required: false,default: null},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Inquiry", inquirySchema)