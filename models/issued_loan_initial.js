const mongoose = require("mongoose")

const issuedLoanInitialSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    customer: {type: String, ref: "Customer", required: true},
    scheme: {type: String, ref: "Scheme", required: true},
    loanNo: String,
    transactionNo: String,
    issueDate: Date,
    jewellerName: String,
    nextInstallmentDate: {type: Date, default: null},
    lastInstallmentDate: {type: Date, default: null},
    uchakInterestAmount: {type: Number, default: 0},
    propertyDetails: [],
    propertyImage: String,
    consultingCharge: {type: Number, default: 0},
    approvalCharge: {type: Number, default: 0},
    loanAmount: Number,
    amountPaid: {type: Number, default: 0},
    paymentMode: String,
    cashAmount: Number,
    pendingCashAmount: {type: Number, default: 0},
    payingCashAmount: {type: Number, default: 0},
    payingBankAmount: {type: Number, default: 0},
    pendingBankAmount: {type: Number, default: 0},
    bankAmount: Number,
    loanType: {type: String, default: "GOLD LOAN"},
    interestLoanAmount: Number,
    issuedBy: {ref: "User", type: String, required: false},
    closedBy: {ref: "User", type: String, required: false},
    companyBankDetail: {type: Object, default: null},
    customerBankDetail: {type: Object, default: null},
    status: {type: String, default: 'Issued'},
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Issued Loan Initial', issuedLoanInitialSchema)





