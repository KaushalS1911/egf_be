const mongoose = require('mongoose')

const incomeSchema = new mongoose.Schema({
    company: {type: String, ref: 'Company'},
    branch: {type: String, ref: 'Branch'},
    incomeType: String,
    description: String,
    category: String,
    date: Date,
    paymentDetails: Object
},{timestamps: true});

module.exports = mongoose.model('Other income', incomeSchema)