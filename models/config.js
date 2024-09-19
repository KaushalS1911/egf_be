
const mongoose = require('mongoose')

const configSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    goldRate: Number,
    businessType: [],
    permissions: {},
    roles: [],
},{timestamps: true})

module.exports = mongoose.model("Config", configSchema)