const mongoose = require("mongoose")

const issuedLoanSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    customer: {type: String, ref: "Customer", required: true},
    scheme: {type: String, ref: "Scheme", required: true},
    loanNo: String,
    transactionNo: String,
    issueDate: Date,
    jewellerName: String,
    nextInstallmentDate: {type: Date, default: null},
    lastInstallmentDate: {type: Date, default: null},
    propertyDetails: [],
    propertyImage: String,
    loanAmount: Number,
    uchakAmount: {type: Number, default: 0},
    amountPaid: {type: Number, default: 0},
    paymentMode: String,
    cashAmount: Number,
    pendingCashAmount: {type: Number, default: 0},
    pendingBankAmount: {type: Number, default: 0},
    bankAmount: Number,
    interestLoanAmount: Number,
    issuedBy: {ref: "User", type: String, required: false},
    closedBy: {ref: "User", type: String, required: false},
    companyBankDetail: {type: Object, default: null},
    customerBankDetail: {type: Object, default: null},
    status: {type: String, default: 'Issued'},
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Issued Loan', issuedLoanSchema)





