const IssuedLoanModel = require("../models/issued-loan");
const PenaltyModel = require("../models/penalty");
const InterestModel = require("../models/interest");
const mongoose = require('mongoose')
const {uploadPropertyFile} = require("../helpers/avatar");

async function issueLoan(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {companyId} = req.params
        const {
            customer,
            scheme,
        } = req.body;

        const isLoanExist = await IssuedLoanModel.exists({
            company: companyId,
            customer,
            scheme,
            deleted_at: {$eq: null}
        });

        if (isLoanExist) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(400).json({status: 400, message: "Loan already exists."});
        }
        const property = req.file && req.file.buffer ? await uploadPropertyFile(req.file.buffer) : null;
        const issuedLoan = new IssuedLoanModel({
            ...req.body,
            company: companyId,
            loanNo: await generateLoanNumber(companyId),
            transactionNo: await generateTransactionNumber(companyId),
            propertyImage: property,
        });

        await issuedLoan.save({session});
        await session.commitTransaction();
        await session.endSession();

        return res.status(201).json({status: 201, message: "Loan issued successfully", data: issuedLoan});
    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function disburseLoan(req, res) {

    try {
        const {loan, to,from, consultingCharge, loanAmount,interest, companyBankDetail } = req.body

        const todayDate = new Date();
        const nextInstallmentDate = getNextInterestPayDate(todayDate)

        const timeDifference = nextInstallmentDate - todayDate;

        const days = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

        const loanDetail = await IssuedLoanModel.findById(loan)

        loanDetail.status = "Disbursed"

        if(companyBankDetail) loanDetail.companyBankDetail = companyBankDetail

        const disbursedLoan = await IssuedLoanModel.findByIdAndUpdate(loan, loanDetail, {new: true});

        await InterestModel.create({
            loan,
            to, from , consultingCharge,
            interestAmount: calculateInterest(loanAmount, interest, days),
        });

        return res.status(201).json({status: 201, message: "Loan disbursed successfully", data: disbursedLoan});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function interestPayment(req, res) {

    try {
        const {loan, to,from, consultingCharge, loanAmount,interest, companyBankDetail } = req.body

        const todayDate = new Date();
        const nextInstallmentDate = getNextInterestPayDate(todayDate)

        const timeDifference = nextInstallmentDate - todayDate;

        const days = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

        const loanDetail = await IssuedLoanModel.findById(loan)

        loanDetail.status = "Disbursed"

        if(companyBankDetail) loanDetail.companyBankDetail = companyBankDetail

        const disbursedLoan = await IssuedLoanModel.findByIdAndUpdate(loan, loanDetail, {new: true});

        await InterestModel.create({
            loan,
            to, from , consultingCharge,
            interestAmount: calculateInterest(loanAmount, interest, days),
        });

        return res.status(201).json({status: 201, message: "Loan disbursed successfully", data: disbursedLoan});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllLoans(req, res) {
    try {
        const {companyId} = req.params
        const {type} = req.query

        let query = {
            company: companyId,
            deleted_at: null
        }

        if(type) query.status = type

        const loans = await IssuedLoanModel.find(query)
            .populate("customer")
            .populate("scheme");

        if (!loans || loans.length === 0) {
            return res.status(404).json({status: 404, message: "No loans found"});
        }

        return res.status(200).json({status: 200, data: loans});
    } catch (err) {
        console.error("Error fetching loans:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateLoan(req, res) {
    try {
        const {loanId} = req.params;

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(loanId, req.body, {new: true});

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Loan not found."});
        }

        return res.status(200).json({status: 200, data: updatedLoan, message: "Loan updated successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleLoan(req, res) {
    const {loanId} = req.params;

    try {
        const loan = await IssuedLoanModel.findById(loanId)
            .populate("customer")
            .populate("scheme");

        if (!loan) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        return res.status(200).json({status: 200, data: loan});
    } catch (err) {
        console.error("Error fetching loan:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteMultipleLoans(req, res) {
    try {
        const {ids} = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({status: 400, message: "Invalid loan IDs."});
        }

        await IssuedLoanModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );

        return res.status(200).json({status: 200, message: "Loans deleted successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

const getCurrentFinancialYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 4) {
        return `${currentYear.toString().slice(-2)}_${(currentYear + 1).toString().slice(-2)}`;
    } else {
        return `${(currentYear - 1).toString().slice(-2)}_${currentYear.toString().slice(-2)}`;
    }
};

const generateLoanNumber = async (companyId) => {
    const financialYear = getCurrentFinancialYear();

    const loanCount = await IssuedLoanModel.countDocuments({
        company: companyId,
        loanNo: {$regex: `^EGF/${financialYear}`}
    });

    const newLoanCount = loanCount + 1;

    const loanNumber = `EGF/${financialYear}_${String(newLoanCount).padStart(6, '0')}`;

    return loanNumber;
};


const generateTransactionNumber = async (companyId) => {
    const prefix = 'TRXN';

    let count = 0

    count = await IssuedLoanModel.countDocuments({company: companyId});

    count += 1;

    const numberPart = String(count).padStart(6, '0');

    const transactionNumber = `${prefix}${numberPart}`;

    return transactionNumber;
};

const applyPenaltyIfLate = async (loanId, installmentId, paymentDate) => {
    const loan = await IssuedLoanModel.findById(loanId).populate('scheme');

    const {installments, scheme, company, loanAmount} = loan

    const installment = installments.id(installmentId);

    const dueDate = new Date(installment.date);
    const daysLate = Math.floor((paymentDate - dueDate) / (1000 * 60 * 60 * 24));

    let newInterestRate = scheme.interestRate;

    const penaltyMaster = await PenaltyModel.find({company: company});
    let penaltyApplied = false;

    for (let range of penaltyMaster.ranges) {
        if (daysLate >= range.afterDueDateFromDate && daysLate <= range.afterDueDateToDate) {
            newInterestRate += range.penaltyInterest;
            penaltyApplied = true;
            break;
        }
    }

    let daysBetweenInstallments = 30;

    if (!penaltyApplied) {
        daysBetweenInstallments = 30 + daysLate;
        newInterestRate = loan.interestRate
        installment.amount = calculateInterest(loanAmount, newInterestRate, daysBetweenInstallments)
        console.log('No penalty applied. Paid on time or within grace period.');
    }

    installment.amount = calculateInterest(loanAmount, newInterestRate, daysBetweenInstallments);
    installment.status = 'Paid';
    installment.date = paymentDate;
    loan.nextInstallmentDate = new Date(paymentDate.setDate(paymentDate.getDate() + 30));

    await loan.save();

};

const calculateInterest = (loanAmount, rateOfInterest, days) => {
    return (loanAmount * rateOfInterest * days) / (30 * 100);
};

function getNextInterestPayDate(issueDate) {
    let nextPayDate = new Date(issueDate);

    nextPayDate.setDate(nextPayDate.getDate() + 30);

    return nextPayDate;
}


module.exports = {issueLoan, getAllLoans, updateLoan, getSingleLoan, deleteMultipleLoans, disburseLoan,interestPayment}