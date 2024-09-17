const mongoose = require('mongoose')

const bankAccountSchema = new mongoose.Schema({
    accountNumber: String,
    accountType: String,
    accountHolderName: String,
    bankName: String,
    IFSC: String,
    branchName: String,
})

module.exports = bankAccountSchema