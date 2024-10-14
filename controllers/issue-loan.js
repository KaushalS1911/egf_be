const IssuedLoanModel = require("../models/issued-loan");
const PenaltyModel = require("../models/penalty");
const InterestModel = require("../models/interest");
const PartReleaseModel = require("../models/part-release");
const PartPaymentModel = require("../models/loan-part-payment");
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
        const nextInstallmentDate = getNextInterestPayDate(req.body.issueDate)
        const issuedLoan = new IssuedLoanModel({
            ...req.body,
            nextInstallmentDate,
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
        const {loan, companyBankDetail, bankAmount, cashAmount,pendingBankAmount, pendingCashAmount  } = req.body

        const loanDetail = await IssuedLoanModel.findById(loan)

        loanDetail.status = "Disbursed"
        loanDetail.companyBankDetail = companyBankDetail
        loanDetail.cashAmount = cashAmount
        loanDetail.bankAmount = bankAmount
        loanDetail.pendingCashAmount = pendingCashAmount
        loanDetail.pendingBankAmount = pendingBankAmount

        if(companyBankDetail) loanDetail.companyBankDetail = companyBankDetail

        const disbursedLoan = await IssuedLoanModel.findByIdAndUpdate(loan, loanDetail, {new: true});

        return res.status(201).json({status: 201, message: "Loan disbursed successfully", data: disbursedLoan});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function interestPayment(req, res) {
    try {
        const {loanId} = req.params

        const interestDetail = await InterestModel.create({
            loan: loanId,
            ...req.body
        })

        const paymentDate = new Date(req.body.to)
        const nextInstallmentDate = getNextInterestPayDate(paymentDate)
        const lastInstallmentDate = new Date()

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, lastInstallmentDate}, {new: true})

        return res.status(201).json({status: 201, message: "Loan interest paid successfully", data: interestDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateInterestPayment(req, res) {
    try {
        const {loanId, interestId} = req.params

        const updatedInterestDetail = await InterestModel.findByIdAndUpdate(interestId, req.body, {new: true})

        const paymentDate = new Date(req.body.to)
        const nextInstallmentDate = getNextInterestPayDate(paymentDate)
        const lastInstallmentDate = new Date()

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, lastInstallmentDate}, {new: true})

        return res.status(201).json({status: 201, message: "Loan interest details updated successfully", data: updatedInterestDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetInterestPayment(req, res) {

    try {
        const {loanId} = req.params

        const interestDetail = await InterestModel.find({
            loan: loanId,
            deleted_at: null
        }).sort({ createdAt: -1 }).populate({path: "loan", populate: {path: "scheme"}});

        return res.status(200).json({status: 200,  data: interestDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetPartPaymentDetail(req, res) {

    try {
        const {loanId} = req.params

        const paymentDetail = await PartPaymentModel.find({
            loan: loanId,
            deleted_at: null
        })

        return res.status(200).json({status: 200,  data: paymentDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetPartReleaseDetail(req, res) {

    try {
        const {loanId} = req.params

        const partReleaseDetail = await PartReleaseModel.find({
            loan: loanId,
            deleted_at: null
        }).populate('loan')

        return res.status(200).json({status: 200,  data: partReleaseDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updatePartReleaseDetail(req, res) {

    try {
        const {loanId, partId} = req.params

        const loanDetails = await IssuedLoanModel.findById(loanId).select('interestLoanAmount totalAmount')

        let {interestLoanAmount} = loanDetails

        interestLoanAmount =  interestLoanAmount - req.body.amountPaid

        const nextInstallmentDate = getNextInterestPayDate(new Date())

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, interestLoanAmount}, {new: true})

        const updatedPartReleaseDetail = await PartReleaseModel.findByIdAndUpdate(partId, req.body, {new: true})

        return res.status(200).json({status: 200, message: "Part release details updated successfully",  data: updatedPartReleaseDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function partRelease(req, res) {

    try {
        const {loanId} = req.params

        const propertyImage = req.file && req.file.buffer ? await uploadPropertyFile(req.file.buffer) : null;

        const loanDetails = await IssuedLoanModel.findById(loanId)

        const releasedProperty = req.body.property

        let finalProperty = []

        releasedProperty.forEach((e) => {
            finalProperty = loanDetails?.propertyDetails.filter((item) => item.type !== e.type)
        })

        const partDetail = await PartReleaseModel.create({
            loan: loanId,
            propertyImage,
            ...req.body
        })

        const interestLoanAmount =  Number(loanDetails.interestLoanAmount) - Number(req.body.amountPaid)

        const nextInstallmentDate = getNextInterestPayDate(new Date())

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, interestLoanAmount: Number(interestLoanAmount), propertyDetails: finalProperty}, {new: true})

        return res.status(201).json({status: 201, message: "Part released successfully", data: partDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function loanPartPayment(req, res) {

    try {
        const {loanId} = req.params

        const partPaymentDetail = await PartPaymentModel.create({
            loan: loanId,
            ...req.body
        })

        const loanDetails = await IssuedLoanModel.findById(loanId).select('interestLoanAmount totalAmount')

        let {interestLoanAmount, totalAmount} = loanDetails

        interestLoanAmount -= totalAmount
        const nextInstallmentDate = getNextInterestPayDate(new Date())

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, interestLoanAmount}, {new: true})

        return res.status(201).json({status: 201, message: "Loan part payment success", data: partPaymentDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updatePartPaymentDetail(req, res) {

    try {
        const {loanId, partId} = req.params


        const partDetail = await PartReleaseModel.create({
            loan: loanId,
            ...req.body
        })

        const loanDetails = await IssuedLoanModel.findById(loanId).select('interestLoanAmount totalAmount')

        let {interestLoanAmount} = loanDetails

        interestLoanAmount =  interestLoanAmount - req.body.amountPaid

        const nextInstallmentDate = getNextInterestPayDate(new Date())

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, interestLoanAmount}, {new: true})

        return res.status(201).json({status: 201, message: "Part released successfully", data: partDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllLoans(req, res) {
    try {
        const {companyId} = req.params
        const {type, branch} = req.query

        let query = {
            company: companyId,
            deleted_at: null
        }

        if(type) query.status = type

        const loans = await IssuedLoanModel.find(query)
            .populate({
                path: "customer",
                match: branch ? { "branch._id": branch } : {},
            })
            .populate("scheme");

        return res.status(200).json({status: 200, data: loans});
    } catch (err) {
        console.error("Error fetching loans:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateLoan(req, res) {
    try {
        const {loanId} = req.params;

        let payload = req.body
        if(req.file && req.file.buffer) payload.propertyImage = await uploadPropertyFile(req.file.buffer)


        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(loanId, payload, {new: true});

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


module.exports = {issueLoan, getAllLoans, updateLoan, getSingleLoan, deleteMultipleLoans, disburseLoan,interestPayment,partRelease,updatePartPaymentDetail, loanPartPayment, GetInterestPayment,GetPartPaymentDetail,GetPartReleaseDetail,updateInterestPayment,updatePartReleaseDetail}