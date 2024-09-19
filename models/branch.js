const mongoose = require('mongoose')
const addressSchema = require("./common/address");

const branchSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    name: String,
    branchCode: String,
    email: {type: String, default: null},
    contact: {type: String, default: null},
    isActive: {type: Boolean, default: true},
    address: addressSchema,
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Branch", branchSchema)