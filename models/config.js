
const mongoose = require('mongoose')

const configSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    goldRate: Number,
    headersConfig: {},
    businessType: [],
    loanTypes: [],
    permissions: {},
    roles: [],
    remarks: [],
    exportPolicyConfig: []
},{timestamps: true})

module.exports = mongoose.model("Config", configSchema)