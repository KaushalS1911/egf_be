const mongoose = require('mongoose')

const caratSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: 'Branch', required: true},
    name: String,
    caratPercentage: String,
    remark: String,
    isActive: {type: Boolean, default: true},
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Carat", caratSchema)