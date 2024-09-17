const mongoose = require('mongoose')

const branchSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    name: String,
    branchCode: String,
    email: {type: String, default: null},
    contact: {type: String, default: null},
    status: {type: String, default: "Active"},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Branch", branchSchema)