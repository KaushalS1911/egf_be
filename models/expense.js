const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
    company: {type: String, ref: 'Company'},
    branch: {type: String, ref: 'Branch'},
    invoice: {type: String},
    expenseType: String,
    description: String,
    category: String,
    date: Date,
    paymentDetail: Object,
    deleted_at: {type: Date, default: null},
},{timestamps: true});

module.exports = mongoose.model('Expense', expenseSchema)