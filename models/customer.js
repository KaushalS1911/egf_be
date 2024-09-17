const mongoose = require('mongoose')
const addressSchema = require("./common/address");

const customerSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", required: true},
    firstName: String,
    middleName: String,
    lastName: String,
    email: String,
    contact: String,
    dob: String,
    drivingLicense: String,
    customerCode: String,
    landline: String,
    joiningDate: String,
    panCard: String,
    aadharCard: String,
    otpContact: String,
    businessType: String,
    loanType: String,
    isActive: {type: String, default: "Is Active"},
    remark: String,
    avatar_url: {type: String, default: null},
    permanentAddress: addressSchema,
    temporaryAddress: addressSchema,
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Customer",customerSchema)