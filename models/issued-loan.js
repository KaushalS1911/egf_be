const mongoose = require("mongoose")
const bankAccountSchema = require("./common/bank");

const installmentSchema = new mongoose.Schema({
    date: Date,
    amount: Number,
    status: {type: String, default: "pending"},
})

const issuedLoanSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    customer: {type: String, ref: "Customer", required: true},
    scheme: {type: String, ref: "Scheme", required: true},
    loanNo: String,
    transactionNo: String,
    issueDate: Date,
    installments: [installmentSchema],
    jewellerName: String,
    propertyDetails: [],
    propertyImage: String,
    loanAmount: Number,
    amountPaid: Number,
    paymentMode: String,
    cashAmount: Number,
    bankAmount: Number,
    consultingCharge: Number,
    bankAmount: Number,
    bankDetail: {bankAccountSchema},
    status: {type: String, default: 'Active'},
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Issued Loan', issuedLoanSchema)





