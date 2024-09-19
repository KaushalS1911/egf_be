
const mongoose = require('mongoose')
const addressSchema = require("./common/address");
const bankAccountSchema = require("./common/bank");

const employeeSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", required: true},
    user: {type: String, ref: "User", required: true},
    drivingLicense: String,
    panCard: String,
    voterCard: String,
    aadharCard: String,
    dob: Date,
    remark: String,
    reportingTo: {type: String, ref: "User", required: true},
    joiningDate: Date,
    leaveDate: Date,
    permanentAddress: addressSchema,
    temporaryAddress: addressSchema,
    bankDetails: [bankAccountSchema],
    status: {type: String, default: "Active"},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Employee",employeeSchema)