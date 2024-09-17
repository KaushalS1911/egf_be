const mongoose = require('mongoose')

const companySchema = new mongoose.Schema({
    name: String,
    email: {type: String, default: null},
    contact: {type: String, default: null},
    logo_url: {type: String, default: null},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Company", companySchema)