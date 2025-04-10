const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
    company: {type: String, ref: 'Company'},
    branch: {type: String, ref: 'Branch'},
    invoice: {type: String},
    expenseType: String,
    description: String,
    category: String,
    date: Date,
    paymentDetails: Object
},{timestamps: true});

module.exports = mongoose.model('Expense', expenseSchema)