const mongoose = require('mongoose')

const propertySchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    propertyType: String,
    loanType: String,
    remark: String,
    quantity: Number,
    isActive: {type: Boolean, default: true},
    isQtyEdit: Boolean,
    deleted_at: {type: Date, default: null},
},{timestamps: true})

module.exports = mongoose.model("Property", propertySchema)